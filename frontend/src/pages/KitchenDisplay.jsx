import { useEffect, useEffectEvent, useState } from 'react';
import { useStaffAuth } from '../hooks/useStaffAuth';
import api from '../utils/api';
import {
  connectSocket,
  disconnectSocket,
  joinRestaurantRoom,
  leaveRestaurantRoom,
  socket,
} from '../utils/socket';

const KDS_VISIBLE_STATUSES = new Set(['PAID', 'PREPARING']);

const STATUS_CONFIG = {
  PAID: {
    label: 'Paid',
    badge: 'bg-blue-100 text-blue-800',
    card: 'border-blue-200 bg-blue-50',
  },
  PREPARING: {
    label: 'Preparing',
    badge: 'bg-orange-100 text-orange-800',
    card: 'border-orange-200 bg-orange-50',
  },
};

const sortOrdersByNewest = (orders) => (
  [...orders].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
);

const mergeOrderSnapshot = (existingOrder, incomingOrder) => ({
  ...existingOrder,
  ...incomingOrder,
  items: incomingOrder.items?.length ? incomingOrder.items : (existingOrder?.items ?? []),
  tableId: incomingOrder.tableId ?? existingOrder?.tableId ?? null,
  createdAt: incomingOrder.createdAt ?? existingOrder?.createdAt ?? new Date().toISOString(),
});

const applyOrderUpdate = (previousOrders, incomingOrder, relevantStatuses) => {
  const existingOrder = previousOrders.find((order) => String(order._id) === String(incomingOrder._id));
  const nextOrder = mergeOrderSnapshot(existingOrder, incomingOrder);
  const remainingOrders = previousOrders.filter((order) => String(order._id) !== String(nextOrder._id));

  if (!relevantStatuses.has(nextOrder.status)) {
    return remainingOrders;
  }

  return sortOrdersByNewest([nextOrder, ...remainingOrders]);
};

const getItemName = (item) => item.menuItemId?.name ?? item.menuItemId ?? 'Item';

const OrderCard = ({ order, isUpdating, onAccept, onMarkReady, onReject }) => {
  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PAID;

  return (
    <article className={`${config.card} rounded-3xl border p-5 shadow-lg shadow-slate-900/5`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
            #{String(order._id).slice(-6).toUpperCase()}
          </p>
          <h2 className="text-lg font-black text-slate-900">
            {order.customerName || 'Guest'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <span className={`${config.badge} rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]`}>
          {config.label}
        </span>
      </div>

      <ul className="mt-5 space-y-2">
        {order.items.length > 0 ? (
          order.items.map((item, index) => (
            <li key={`${order._id}-${index}`} className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 text-sm">
              <span className="font-semibold text-slate-700">{getItemName(item)}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-slate-700">
                x {item.quantity}
              </span>
            </li>
          ))
        ) : (
          <li className="rounded-2xl bg-white/60 px-3 py-3 text-sm text-slate-500">
            Waiting for item details...
          </li>
        )}
      </ul>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onAccept(order._id)}
          disabled={isUpdating || order.status === 'PREPARING'}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUpdating && order.status !== 'PREPARING' ? 'Updating...' : 'Accept'}
        </button>

        <button
          type="button"
          onClick={() => onMarkReady(order._id)}
          disabled={isUpdating}
          className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUpdating ? 'Updating...' : 'Mark Ready'}
        </button>

        <button
          type="button"
          onClick={() => {
            if (window.confirm("Are you sure you want to reject this order? This will trigger a refund.")) {
              onReject(order._id);
            }
          }}
          disabled={isUpdating}
          className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUpdating ? 'Updating...' : 'Reject Order'}
        </button>
      </div>
    </article>
  );
};

const KitchenDisplay = () => {
  const { logout, staffUser } = useStaffAuth();
  const restaurantId = staffUser?.restaurantId;
  const [activeOrders, setActiveOrders] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingOrderIds, setUpdatingOrderIds] = useState({});

  const hydrateInitialOrders = useEffectEvent((orders) => {
    const nextOrders = (orders ?? []).reduce(
      (collection, order) => applyOrderUpdate(collection, order, KDS_VISIBLE_STATUSES),
      [],
    );

    setActiveOrders(nextOrders);
  });

  const handleOrderUpdated = useEffectEvent((payload) => {
    const incomingOrder = payload?.order;
    if (!incomingOrder?._id) {
      return;
    }

    setActiveOrders((previousOrders) => applyOrderUpdate(previousOrders, incomingOrder, KDS_VISIBLE_STATUSES));
    setUpdatingOrderIds((previousIds) => {
      if (!previousIds[incomingOrder._id]) {
        return previousIds;
      }

      const nextIds = { ...previousIds };
      delete nextIds[incomingOrder._id];
      return nextIds;
    });
  });

  useEffect(() => {
    if (!restaurantId) {
      return undefined;
    }

    const currentSocket = connectSocket();
    joinRestaurantRoom(restaurantId);

    const handleConnect = () => {
      setIsConnected(true);
      joinRestaurantRoom(restaurantId);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    currentSocket.on('connect', handleConnect);
    currentSocket.on('disconnect', handleDisconnect);
    currentSocket.on('order_updated', handleOrderUpdated);

    const fetchInitialOrders = async () => {
      try {
        setLoading(true);
        const response = await api.get('/orders?status=PAID,PREPARING');
        hydrateInitialOrders(response.data.data);
        setError('');
      } catch (fetchError) {
        console.error('KDS fetch error:', fetchError);
        setError(fetchError.response?.data?.message || 'Failed to load active kitchen orders.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialOrders();

    return () => {
      currentSocket.off('connect', handleConnect);
      currentSocket.off('disconnect', handleDisconnect);
      currentSocket.off('order_updated', handleOrderUpdated);
      leaveRestaurantRoom(restaurantId);
      disconnectSocket();
    };
  }, [restaurantId]);

  const handleUpdateStatus = async (orderId, nextStatus) => {
    const targetOrder = activeOrders.find((order) => String(order._id) === String(orderId));
    if (!targetOrder || targetOrder.status === nextStatus) {
      return;
    }

    const previousStatus = targetOrder.status;

    setError('');
    setUpdatingOrderIds((previousIds) => ({ ...previousIds, [orderId]: true }));
    setActiveOrders((previousOrders) => applyOrderUpdate(
      previousOrders,
      { ...targetOrder, status: nextStatus },
      KDS_VISIBLE_STATUSES,
    ));

    try {
      await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
    } catch (updateError) {
      console.error('Failed to update order status:', updateError);

      setActiveOrders((previousOrders) => applyOrderUpdate(
        previousOrders,
        { ...targetOrder, status: previousStatus },
        KDS_VISIBLE_STATUSES,
      ));

      setUpdatingOrderIds((previousIds) => {
        const nextIds = { ...previousIds };
        delete nextIds[orderId];
        return nextIds;
      });
      setError(updateError.response?.data?.message || 'Failed to update order status. Please try again.');
    }
  };

  const paidOrders = activeOrders.filter((order) => order.status === 'PAID');
  const preparingOrders = activeOrders.filter((order) => order.status === 'PREPARING');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-300">Chef Station</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Kitchen Display</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                {staffUser?.role}
              </p>
              <p className="text-sm text-slate-300">{staffUser?.email}</p>
            </div>

            <div className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-slate-200">
              <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-500'}`} />
              {isConnected ? 'Live' : 'Disconnected'}
            </div>

            <button
              type="button"
              onClick={logout}
              className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="mr-3 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-blue-400" />
            <span className="text-slate-400">Loading kitchen orders...</span>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 rounded-2xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              <section>
                <div className="mb-4 flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-slate-900">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">Freshly Paid</p>
                    <h2 className="mt-1 text-xl font-black">Waiting for Acceptance</h2>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-blue-700">
                    {paidOrders.length}
                  </span>
                </div>

                <div className="grid gap-4">
                  {paidOrders.length > 0 ? (
                    paidOrders.map((order) => (
                      <OrderCard
                        key={order._id}
                        order={order}
                        isUpdating={Boolean(updatingOrderIds[order._id])}
                        onAccept={(orderId) => handleUpdateStatus(orderId, 'PREPARING')}
                        onMarkReady={(orderId) => handleUpdateStatus(orderId, 'READY')}
                        onReject={(orderId) => handleUpdateStatus(orderId, 'REJECTED')}
                      />
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-12 text-center text-sm text-slate-400">
                      No paid orders are waiting right now.
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-slate-900">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-700">In Progress</p>
                    <h2 className="mt-1 text-xl font-black">Currently Preparing</h2>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-orange-700">
                    {preparingOrders.length}
                  </span>
                </div>

                <div className="grid gap-4">
                  {preparingOrders.length > 0 ? (
                    preparingOrders.map((order) => (
                      <OrderCard
                        key={order._id}
                        order={order}
                        isUpdating={Boolean(updatingOrderIds[order._id])}
                        onAccept={(orderId) => handleUpdateStatus(orderId, 'PREPARING')}
                        onMarkReady={(orderId) => handleUpdateStatus(orderId, 'READY')}
                        onReject={(orderId) => handleUpdateStatus(orderId, 'REJECTED')}
                      />
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-12 text-center text-sm text-slate-400">
                      No orders are being prepared at the moment.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default KitchenDisplay;
