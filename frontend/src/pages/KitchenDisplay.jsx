import { useEffect, useState } from 'react';
import { useStaffAuth } from '../hooks/useStaffAuth';
import api from '../utils/api';
import { socket } from '../utils/socket';

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'Paid', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
  PREPARING: { label: 'Preparing', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800' },
  READY: { label: 'Ready', bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-800' },
};

const OrderCard = ({ order, onAccept, onMarkReady, isUpdating }) => {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;

  return (
    <div className={`${cfg.bg} ${cfg.border} flex flex-col gap-3 rounded-2xl border p-4 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-0.5 font-mono text-xs text-gray-400">
            #{String(order._id).slice(-6).toUpperCase()}
          </p>
          <p className="text-sm font-black text-gray-800">
            {order.customerName || 'Guest'}
          </p>
          {order.tableId?.tableNumber && (
            <p className="mt-0.5 text-xs text-gray-500">
              Table {order.tableId.tableNumber}
            </p>
          )}
        </div>
        <span className={`${cfg.badge} rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide`}>
          {cfg.label}
        </span>
      </div>

      <ul className="divide-y divide-white/70 text-sm">
        {order.items.length > 0 ? (
          order.items.map((item, idx) => {
            const name = item.menuItemId?.name ?? item.menuItemId ?? 'Item';
            return (
              <li key={idx} className="flex justify-between py-1.5">
                <span className="text-gray-700">{name}</span>
                <span className="rounded-lg bg-white/60 px-2 font-bold text-gray-800">
                  x {item.quantity}
                </span>
              </li>
            );
          })
        ) : (
          <li className="py-1.5 text-xs text-gray-500">Waiting for full order details...</li>
        )}
      </ul>

      <p className="text-[10px] text-gray-400">
        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>

      <div className="mt-1 flex gap-2">
        <button
          onClick={() => onAccept(order._id)}
          disabled={isUpdating}
          className="flex-1 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUpdating ? 'Updating...' : 'Accept'}
        </button>
        <button
          onClick={() => onMarkReady(order._id)}
          disabled={isUpdating}
          className="flex-1 rounded-xl bg-green-600 py-2 text-xs font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUpdating ? 'Updating...' : 'Mark Ready'}
        </button>
      </div>
    </div>
  );
};

const KanbanColumn = ({ title, orders, color, onAccept, onMarkReady, updatingOrderIds }) => (
  <div className="flex min-w-[280px] flex-col gap-3">
    <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${color}`}>
      <h2 className="text-sm font-black uppercase tracking-wider text-gray-700">{title}</h2>
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-700 shadow-sm">
        {orders.length}
      </span>
    </div>
    <div className="flex flex-col gap-3">
      {orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center text-xs text-gray-400">
          No orders here
        </div>
      ) : (
        orders.map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            onAccept={onAccept}
            onMarkReady={onMarkReady}
            isUpdating={Boolean(updatingOrderIds[order._id])}
          />
        ))
      )}
    </div>
  </div>
);

const KitchenDisplay = () => {
  const { logout, staffUser } = useStaffAuth();
  const [activeOrders, setActiveOrders] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingOrderIds, setUpdatingOrderIds] = useState({});

  useEffect(() => {
    socket.connect();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    const fetchInitialOrders = async () => {
      try {
        setLoading(true);
        const response = await api.get('/orders?status=PENDING,PAID,PREPARING,READY');
        setActiveOrders(response.data.data ?? []);
        setError('');
      } catch (err) {
        console.error('KDS fetch error:', err);
        setError('Failed to load orders. Make sure you are logged in as kitchen staff.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialOrders();

    const handleKitchenEvent = (data) => {
      setActiveOrders((prev) => {
        const exists = prev.find((order) => String(order._id) === String(data.orderId));

        if (exists) {
          return prev.map((order) =>
            String(order._id) === String(data.orderId)
              ? { ...order, status: data.status ?? order.status }
              : order
          );
        }

        return [
          {
            _id: data.orderId,
            customerName: data.customerName ?? 'Guest',
            status: data.status ?? 'PAID',
            orderType: data.orderType,
            tableId: data.tableNumber ? { tableNumber: data.tableNumber } : null,
            items: [],
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ];
      });
    };

    const handleStatusUpdate = (data) => {
      setActiveOrders((prev) =>
        prev
          .map((order) =>
            String(order._id) === String(data.orderId)
              ? { ...order, status: data.status }
              : order
          )
          .filter((order) => !['DELIVERED', 'CANCELLED'].includes(order.status))
      );

      setUpdatingOrderIds((prev) => {
        const next = { ...prev };
        delete next[data.orderId];
        return next;
      });
    };

    socket.on('kitchenEvent', handleKitchenEvent);
    socket.on('orderStatusUpdated', handleStatusUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('kitchenEvent', handleKitchenEvent);
      socket.off('orderStatusUpdated', handleStatusUpdate);
      socket.disconnect();
    };
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    const targetOrder = activeOrders.find((order) => String(order._id) === String(orderId));
    const previousStatus = targetOrder?.status;

    if (!targetOrder || previousStatus === newStatus) {
      return;
    }

    setError('');
    setUpdatingOrderIds((prev) => ({ ...prev, [orderId]: true }));
    setActiveOrders((prev) =>
      prev.map((order) =>
        String(order._id) === String(orderId)
          ? { ...order, status: newStatus }
          : order
      )
    );

    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      setUpdatingOrderIds((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    } catch (err) {
      console.error('Failed to update order status:', err);

      if (previousStatus) {
        setActiveOrders((prev) =>
          prev.map((order) =>
            String(order._id) === String(orderId)
              ? { ...order, status: previousStatus }
              : order
          )
        );
      }

      setError(err.response?.data?.message || 'Failed to update order status. Please try again.');
      setUpdatingOrderIds((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  const handleAccept = (orderId) => {
    handleUpdateStatus(orderId, 'PREPARING');
  };

  const handleMarkReady = (orderId) => {
    handleUpdateStatus(orderId, 'READY');
  };

  const pending = activeOrders.filter((order) => order.status === 'PENDING');
  const paid = activeOrders.filter((order) => order.status === 'PAID');
  const preparing = activeOrders.filter((order) => order.status === 'PREPARING');
  const ready = activeOrders.filter((order) => order.status === 'READY');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Live Kitchen Display</h1>
            <p className="text-sm text-gray-400">Real-time order board</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'animate-pulse bg-green-400' : 'bg-red-500'}`} />
              <span className={`text-sm font-semibold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
              <span className="ml-4 text-sm text-gray-500">
                {activeOrders.length} active order{activeOrders.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                {staffUser?.role}
              </p>
              <p className="text-sm text-gray-300">{staffUser?.email}</p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-6">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="mr-3 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
            <span className="text-gray-400">Loading orders...</span>
          </div>
        )}

        {error && !loading && (
          <div className="mb-6 rounded-xl border border-red-800 bg-red-900/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && (
          <div className="flex gap-5 overflow-x-auto pb-4">
            <KanbanColumn
              title="Pending"
              orders={pending}
              color="bg-yellow-100"
              onAccept={handleAccept}
              onMarkReady={handleMarkReady}
              updatingOrderIds={updatingOrderIds}
            />
            <KanbanColumn
              title="Paid"
              orders={paid}
              color="bg-blue-100"
              onAccept={handleAccept}
              onMarkReady={handleMarkReady}
              updatingOrderIds={updatingOrderIds}
            />
            <KanbanColumn
              title="Preparing"
              orders={preparing}
              color="bg-orange-100"
              onAccept={handleAccept}
              onMarkReady={handleMarkReady}
              updatingOrderIds={updatingOrderIds}
            />
            <KanbanColumn
              title="Ready"
              orders={ready}
              color="bg-green-100"
              onAccept={handleAccept}
              onMarkReady={handleMarkReady}
              updatingOrderIds={updatingOrderIds}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default KitchenDisplay;
