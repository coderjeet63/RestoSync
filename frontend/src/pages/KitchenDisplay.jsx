import React, { useState, useEffect } from 'react';
import { socket } from '../utils/socket';
import api from '../utils/api';

// ─── Status config ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING:    { label: 'Pending',    bg: 'bg-yellow-50',  border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800' },
  PAID:       { label: 'Paid',       bg: 'bg-blue-50',    border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-800'   },
  PREPARING:  { label: 'Preparing',  bg: 'bg-orange-50',  border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800'},
  READY:      { label: 'Ready',      bg: 'bg-green-50',   border: 'border-green-200',  badge: 'bg-green-100 text-green-800' },
};

// ─── Sub-component: Order Card ───────────────────────────────────────────────
const OrderCard = ({ order, onAccept, onMarkReady }) => {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;

  return (
    <div className={`${cfg.bg} ${cfg.border} border rounded-2xl p-4 shadow-sm flex flex-col gap-3`}>

      {/* Card Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-gray-400 font-mono mb-0.5">
            #{String(order._id).slice(-6).toUpperCase()}
          </p>
          <p className="font-black text-gray-800 text-sm">
            {order.customerName || 'Guest'}
          </p>
          {order.tableId?.tableNumber && (
            <p className="text-xs text-gray-500 mt-0.5">
              Table {order.tableId.tableNumber}
            </p>
          )}
        </div>
        <span className={`${cfg.badge} text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide`}>
          {cfg.label}
        </span>
      </div>

      {/* Items List */}
      <ul className="divide-y divide-white/70 text-sm">
        {order.items.map((item, idx) => {
          const name = item.menuItemId?.name ?? item.menuItemId ?? 'Item';
          return (
            <li key={idx} className="flex justify-between py-1.5">
              <span className="text-gray-700">{name}</span>
              <span className="font-bold text-gray-800 bg-white/60 px-2 rounded-lg">
                × {item.quantity}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Timestamps */}
      <p className="text-[10px] text-gray-400">
        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => onAccept(order)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-xl transition-colors"
        >
          ✓ Accept
        </button>
        <button
          onClick={() => onMarkReady(order)}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded-xl transition-colors"
        >
          ⚡ Mark Ready
        </button>
      </div>
    </div>
  );
};

// ─── Sub-component: Kanban Column ────────────────────────────────────────────
const KanbanColumn = ({ title, orders, color, onAccept, onMarkReady }) => (
  <div className="flex flex-col gap-3 min-w-[280px]">
    <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${color}`}>
      <h2 className="font-black text-sm text-gray-700 uppercase tracking-wider">{title}</h2>
      <span className="bg-white text-gray-700 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
        {orders.length}
      </span>
    </div>
    <div className="flex flex-col gap-3">
      {orders.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center text-gray-400 text-xs">
          No orders here
        </div>
      ) : (
        orders.map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            onAccept={onAccept}
            onMarkReady={onMarkReady}
          />
        ))
      )}
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const KitchenDisplay = () => {
  const [activeOrders, setActiveOrders] = useState([]);
  const [isConnected, setIsConnected]   = useState(false);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  useEffect(() => {
    // 1. Connect socket
    socket.connect();

    // 2. Track connection state
    const handleConnect    = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    socket.on('connect',    handleConnect);
    socket.on('disconnect', handleDisconnect);

    // 3. Fetch initial orders from REST API
    const fetchInitialOrders = async () => {
      try {
        setLoading(true);
        const response = await api.get('/orders?status=PENDING,PAID,PREPARING');
        setActiveOrders(response.data.data ?? []);
      } catch (err) {
        console.error('❌ KDS fetch error:', err.message);
        setError('Failed to load orders. Make sure you are logged in as kitchen staff.');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialOrders();

    // 4. Real-time: new order arrives after payment (backend emits 'kitchenEvent')
    //    Payload: { orderId, restaurantId, status: 'PAID', orderType, tableNumber, message }
    const handleKitchenEvent = (data) => {
      console.log('🔔 kitchenEvent received:', data);
      setActiveOrders((prev) => {
        // Avoid duplicates — if we already have it, update its status
        const exists = prev.find((o) => String(o._id) === String(data.orderId));
        if (exists) {
          return prev.map((o) =>
            String(o._id) === String(data.orderId) ? { ...o, status: data.status } : o
          );
        }
        // New order — build a minimal card from the socket payload
        return [
          {
            _id:          data.orderId,
            customerName: data.customerName ?? 'Guest',
            status:       data.status ?? 'PAID',
            orderType:    data.orderType,
            tableId:      data.tableNumber ? { tableNumber: data.tableNumber } : null,
            items:        [],
            createdAt:    new Date().toISOString(),
          },
          ...prev,
        ];
      });
    };

    // 5. Real-time: status update from PATCH /api/orders/:id/status
    //    Payload: { orderId, tableId, status, message }
    const handleStatusUpdate = (data) => {
      console.log('🔄 orderStatusUpdated:', data);
      setActiveOrders((prev) =>
        prev
          .map((o) =>
            String(o._id) === String(data.orderId) ? { ...o, status: data.status } : o
          )
          // Remove from board once DELIVERED or CANCELLED
          .filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status))
      );
    };

    socket.on('kitchenEvent',      handleKitchenEvent);
    socket.on('orderStatusUpdated', handleStatusUpdate);

    // 6. Cleanup
    return () => {
      socket.off('connect',           handleConnect);
      socket.off('disconnect',        handleDisconnect);
      socket.off('kitchenEvent',      handleKitchenEvent);
      socket.off('orderStatusUpdated', handleStatusUpdate);
      socket.disconnect();
    };
  }, []);

  // ─── Action handlers ───────────────────────────────────────────────────────
  const handleAccept = (order) => {
    console.log('✅ Accept order:', order._id);
    // TODO: call PATCH /api/orders/:id/status { status: 'PREPARING' }
  };

  const handleMarkReady = (order) => {
    console.log('🍽️ Mark ready:', order._id);
    // TODO: call PATCH /api/orders/:id/status { status: 'READY' }
  };

  // ─── Kanban columns ────────────────────────────────────────────────────────
  const pending   = activeOrders.filter((o) => o.status === 'PENDING');
  const paid      = activeOrders.filter((o) => o.status === 'PAID');
  const preparing = activeOrders.filter((o) => o.status === 'PREPARING');
  const ready     = activeOrders.filter((o) => o.status === 'READY');

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Header ── */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">🍳 Live Kitchen Display</h1>
            <p className="text-gray-400 text-sm">Real-time order board</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-sm font-semibold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
            <span className="text-gray-500 text-sm ml-4">
              {activeOrders.length} active order{activeOrders.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="max-w-screen-xl mx-auto px-6 py-6">

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mr-3" />
            <span className="text-gray-400">Loading orders...</span>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-900/40 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl mb-6">
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
            />
            <KanbanColumn
              title="Paid"
              orders={paid}
              color="bg-blue-100"
              onAccept={handleAccept}
              onMarkReady={handleMarkReady}
            />
            <KanbanColumn
              title="Preparing"
              orders={preparing}
              color="bg-orange-100"
              onAccept={handleAccept}
              onMarkReady={handleMarkReady}
            />
            <KanbanColumn
              title="Ready"
              orders={ready}
              color="bg-green-100"
              onAccept={handleAccept}
              onMarkReady={handleMarkReady}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default KitchenDisplay;
