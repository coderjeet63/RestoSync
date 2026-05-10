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

const WAITER_VISIBLE_STATUSES = new Set(['READY']);

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

const getTableDisplayText = (tableId) => {
  if (!tableId) {
    return 'Walk-in';
  }

  if (typeof tableId === 'object') {
    return tableId.tableNumber ? `Table ${tableId.tableNumber}` : `Table ${tableId._id ?? 'Assigned'}`;
  }

  return `Table ${tableId}`;
};

const WaiterDashboard = () => {
  const { logout, staffUser } = useStaffAuth();
  const restaurantId = staffUser?.restaurantId;
  const [readyOrders, setReadyOrders] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingOrderIds, setUpdatingOrderIds] = useState({});

  const hydrateInitialOrders = useEffectEvent((orders) => {
    const nextOrders = (orders ?? []).reduce(
      (collection, order) => applyOrderUpdate(collection, order, WAITER_VISIBLE_STATUSES),
      [],
    );

    setReadyOrders(nextOrders);
  });

  const handleOrderUpdated = useEffectEvent((payload) => {
    const incomingOrder = payload?.order;
    if (!incomingOrder?._id) {
      return;
    }

    setReadyOrders((previousOrders) => applyOrderUpdate(previousOrders, incomingOrder, WAITER_VISIBLE_STATUSES));
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
        const response = await api.get('/orders?status=READY');
        hydrateInitialOrders(response.data.data);
        setError('');
      } catch (fetchError) {
        console.error('Waiter dashboard fetch error:', fetchError);
        setError(fetchError.response?.data?.message || 'Failed to load ready orders.');
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

  const handleMarkDelivered = async (orderId) => {
    const targetOrder = readyOrders.find((order) => String(order._id) === String(orderId));
    if (!targetOrder) {
      return;
    }

    setError('');
    setUpdatingOrderIds((previousIds) => ({ ...previousIds, [orderId]: true }));
    setReadyOrders((previousOrders) => previousOrders.filter((order) => String(order._id) !== String(orderId)));

    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'COMPLETED' });
    } catch (updateError) {
      console.error('Failed to mark order as delivered:', updateError);
      setReadyOrders((previousOrders) => sortOrdersByNewest([targetOrder, ...previousOrders]));
      setUpdatingOrderIds((previousIds) => {
        const nextIds = { ...previousIds };
        delete nextIds[orderId];
        return nextIds;
      });
      setError(updateError.response?.data?.message || 'Failed to mark the order as delivered.');
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-amber-200 bg-white px-8 py-7 shadow-xl shadow-amber-100/70">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700">Floor Service</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                Waiter Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                Ready orders appear here in real time so the floor team can deliver them immediately.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-amber-200 bg-amber-100 px-4 py-2 text-sm font-black text-amber-900">
                <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {isConnected ? 'Live' : 'Disconnected'}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Signed In
                </p>
                <p className="mt-1 font-semibold text-slate-800">{staffUser?.email}</p>
              </div>

              <button
                type="button"
                onClick={logout}
                className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="mr-3 h-10 w-10 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600" />
              <span className="text-slate-500">Loading ready orders...</span>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Ready Queue</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Orders waiting for delivery
                  </h2>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-lg font-black text-white">
                  {readyOrders.length}
                </div>
              </div>

              {readyOrders.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {readyOrders.map((order) => (
                    <article key={order._id} className="overflow-hidden rounded-[2rem] border border-amber-200 bg-white shadow-lg shadow-amber-100/60">
                      <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-white px-6 py-5">
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">
                          Deliver To
                        </p>
                        <div className="mt-3 flex items-end justify-between gap-4">
                          <div>
                            <h3 className="text-4xl font-black tracking-tight text-slate-950">
                              {getTableDisplayText(order.tableId)}
                            </h3>
                            <p className="mt-2 text-sm font-semibold text-slate-600">
                              {order.customerName || 'Guest'}
                            </p>
                          </div>
                          <span className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white">
                            Ready
                          </span>
                        </div>
                      </div>

                      <div className="px-6 py-5">
                        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                          Order Items
                        </p>
                        <ul className="space-y-2">
                          {order.items.length > 0 ? (
                            order.items.map((item, index) => (
                              <li key={`${order._id}-${index}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5">
                                <span className="font-semibold text-slate-700">{getItemName(item)}</span>
                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm">
                                  x {item.quantity}
                                </span>
                              </li>
                            ))
                          ) : (
                            <li className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                              Waiting for item details...
                            </li>
                          )}
                        </ul>

                        <button
                          type="button"
                          onClick={() => handleMarkDelivered(order._id)}
                          disabled={Boolean(updatingOrderIds[order._id])}
                          className="mt-5 flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingOrderIds[order._id] ? 'Updating...' : 'Mark Delivered'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[2rem] border border-dashed border-amber-300 bg-white px-6 py-16 text-center shadow-lg shadow-amber-100/40">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">All Clear</p>
                  <h3 className="mt-3 text-2xl font-black text-slate-950">No ready orders right now</h3>
                  <p className="mt-3 text-sm text-slate-500">
                    New READY orders will appear here automatically through the live socket feed.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default WaiterDashboard;
