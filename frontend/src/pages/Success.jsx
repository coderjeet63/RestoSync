import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { socket } from '../utils/socket';

const STATUS_PRESENTATION = {
  PENDING: {
    label: 'Order Confirmed',
    message: 'Order Confirmed. Waiting for Kitchen...',
    accent: 'from-blue-500 via-cyan-500 to-sky-500',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  PAID: {
    label: 'Order Confirmed',
    message: 'Order Confirmed. Waiting for Kitchen...',
    accent: 'from-blue-500 via-cyan-500 to-sky-500',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  PREPARING: {
    label: 'In the Kitchen',
    message: 'Chef is preparing your meal \u{1F468}\u200D\u{1F373}',
    accent: 'from-amber-500 via-orange-500 to-rose-500',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  READY: {
    label: 'On the Way',
    message: 'Your food is on the way to your table! \u{1F372}',
    accent: 'from-emerald-500 via-teal-500 to-cyan-500',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  COMPLETED: {
    label: 'Delivered',
    message: 'Delivered! Enjoy your meal \u{1F60B}',
    accent: 'from-lime-500 via-emerald-500 to-green-500',
    badge: 'bg-green-100 text-green-700 border-green-200',
  },
  REJECTED: {
    label: 'Order Cancelled',
    message: 'Order Cancelled by Kitchen. Refund has been initiated.',
    accent: 'from-rose-600 via-red-600 to-red-700',
    badge: 'bg-red-100 text-red-700 border-red-200',
  },
};

const STATUS_STEPS = ['PAID', 'PREPARING', 'READY', 'COMPLETED'];

const getActiveStep = (status) => {
  if (status === 'PENDING') {
    return 1;
  }

  const index = STATUS_STEPS.indexOf(status);
  return index >= 0 ? index + 1 : 1;
};

const getItemName = (item) => item.menuItemId?.name ?? item.menuItemId ?? 'Item';

const mergeOrderItems = (previousItems, incomingItems) => {
  if (!incomingItems?.length) {
    return previousItems || [];
  }

  const previousItemsByMenuId = new Map(
    (previousItems || []).map((item) => [String(item.menuItemId?._id || item.menuItemId), item]),
  );

  return incomingItems.map((incomingItem) => {
    const menuItemKey = String(incomingItem.menuItemId?._id || incomingItem.menuItemId);
    const previousItem = previousItemsByMenuId.get(menuItemKey);

    if (!previousItem || incomingItem.menuItemId?.name) {
      return incomingItem;
    }

    return {
      ...incomingItem,
      menuItemId: previousItem.menuItemId,
    };
  });
};

const Success = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [isBillReady, setIsBillReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const orderId = searchParams.get('orderId') || searchParams.get('jobId');
  const jobId = searchParams.get('jobId') || searchParams.get('orderId');
  const restaurantId = searchParams.get('restaurantId');
  const tableId = searchParams.get('tableId');
  const customerToken = localStorage.getItem('customerToken');

  const menuParams = new URLSearchParams();

  if (restaurantId) {
    menuParams.set('restaurantId', restaurantId);
  }

  if (tableId) {
    menuParams.set('tableId', tableId);
  }

  const menuUrl = menuParams.toString() ? `/?${menuParams.toString()}` : '/';
  const currentStatus = order?.status || 'PENDING';
  const statusConfig = STATUS_PRESENTATION[currentStatus] || STATUS_PRESENTATION.PENDING;
  const activeStep = getActiveStep(currentStatus);
  const displayTable = order?.tableId?.tableNumber || tableId;
  const displayOrderId = order?._id || orderId;
  const formattedPlacedAt = order?.createdAt
    ? new Date(order.createdAt).toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    })
    : null;
  const orderItems = order?.items || [];
  const summaryTotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + ((item.priceAtOrder || item.menuItemId?.price || 0) * (item.quantity || 0)), 0),
    [orderItems],
  );

  useEffect(() => {
    const invoiceTimer = window.setTimeout(() => {
      setIsBillReady(true);
    }, 3500);

    return () => window.clearTimeout(invoiceTimer);
  }, []);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError('We could not find your order reference.');
      return undefined;
    }

    if (!customerToken) {
      setLoading(false);
      setError('Your customer session expired. Please place the order again if needed.');
      return undefined;
    }

    let isMounted = true;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${customerToken}` },
        });

        if (!isMounted) {
          return;
        }

        setOrder(response.data.data);
        setError('');
      } catch (fetchError) {
        console.error('Success page order fetch error:', fetchError);

        if (!isMounted) {
          return;
        }

        setError(fetchError.response?.data?.message || 'Unable to load your order right now.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrder();

    return () => {
      isMounted = false;
    };
  }, [customerToken, orderId]);

  useEffect(() => {
    if (!order?.restaurantId) {
      return undefined;
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join_restaurant', order.restaurantId);

    const handleOrderUpdated = (payload) => {
      const updatedOrder = payload?.order;
      const trackedOrderId = order?._id || orderId;

      if (String(updatedOrder?._id) !== String(trackedOrderId)) {
        return;
      }

      setOrder((previousOrder) => ({
        ...(previousOrder || {}),
        ...updatedOrder,
        items: mergeOrderItems(previousOrder?.items, updatedOrder.items),
        tableId: updatedOrder.tableId ?? previousOrder?.tableId ?? null,
      }));
    };

    socket.on('order_updated', handleOrderUpdated);

    return () => {
      socket.off('order_updated', handleOrderUpdated);
      socket.emit('leave_restaurant', order.restaurantId);
    };
  }, [order?.restaurantId, order?._id, orderId]);

  const handleDownloadInvoice = () => {
    if (!jobId) {
      return;
    }

    window.open(`${import.meta.env.VITE_API_URL}/api/orders/${jobId}/invoice`, '_blank', 'noopener,noreferrer');
  };

  const handleBackToMenu = () => {
    navigate(menuUrl);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_45%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] px-4 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className={`bg-gradient-to-r ${statusConfig.accent} px-6 py-7 text-white sm:px-8`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-white/70">
                    RestoSync Live Tracking
                  </p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                    {statusConfig.label}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
                    {statusConfig.message}
                  </p>
                </div>

                <span className="rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] backdrop-blur">
                  {currentStatus}
                </span>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8">
              <div className="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Order
                  </p>
                  <p className="mt-2 font-mono text-sm text-slate-700">
                    {displayOrderId || 'Waiting...'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Table
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-800">
                    {displayTable ? `Table #${displayTable}` : 'Takeaway'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Placed At
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-800">
                    {formattedPlacedAt || 'Just now'}
                  </p>
                </div>
              </div>

              {currentStatus === 'REJECTED' && (
                <div className="mt-6 flex items-center gap-4 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-black">Refund Initiated</h3>
                    <p className="text-sm font-medium opacity-80">The kitchen has cancelled this order. A full refund has been triggered to your original payment method.</p>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-900">Order Progress</h2>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${statusConfig.badge}`}>
                    Live
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  {STATUS_STEPS.map((stepStatus, index) => {
                    const isActive = activeStep === index + 1;
                    const isComplete = activeStep > index + 1 || currentStatus === 'COMPLETED';

                    return (
                      <div
                        key={stepStatus}
                        className={`rounded-3xl border px-4 py-4 transition ${
                          isComplete
                            ? 'border-emerald-200 bg-emerald-50'
                            : isActive
                              ? 'border-sky-200 bg-sky-50 shadow-sm'
                              : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-black ${
                            isComplete
                              ? 'bg-emerald-500 text-white'
                              : isActive
                                ? 'bg-sky-500 text-white'
                                : 'bg-slate-100 text-slate-500'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                            {stepStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {loading ? (
                <div className="mt-6 flex items-center gap-3 rounded-3xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm font-semibold text-sky-700">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
                  Loading your live order status...
                </div>
              ) : null}

              {error ? (
                <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {currentStatus !== 'REJECTED' && (
                  !isBillReady ? (
                    <div className="flex flex-1 items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3.5 text-sm font-semibold text-blue-700">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                      <span>Generating your official invoice...</span>
                    </div>
                  ) : (
                    <button
                      id="download-invoice-btn"
                      onClick={handleDownloadInvoice}
                      disabled={!jobId}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Download Invoice
                    </button>
                  )
                )}

                <button
                  id="back-to-menu-btn"
                  onClick={handleBackToMenu}
                  className="rounded-2xl bg-slate-100 px-4 py-3.5 font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                  Order Snapshot
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">What's Coming</h2>
              </div>

              <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Live
              </div>
            </div>

            {jobId ? (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Queue Job ID
                </p>
                <p className="mt-2 break-all font-mono text-sm text-slate-700">{jobId}</p>
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              {orderItems.length > 0 ? (
                orderItems.map((item, index) => (
                  <div key={`${displayOrderId || 'order'}-${index}`} className="flex items-center justify-between rounded-3xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="font-bold text-slate-800">{getItemName(item)}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Quantity
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">x {item.quantity}</p>
                      <p className="text-xs text-slate-500">
                        ${(item.priceAtOrder || item.menuItemId?.price || 0).toFixed(2)} each
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Your item list will appear here as soon as the order is loaded.
                </div>
              )}
            </div>

            <div className="mt-6 rounded-3xl bg-slate-950 px-5 py-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">
                Current Total
              </p>
              <p className="mt-3 text-3xl font-black">
                ${summaryTotal.toFixed(2)}
              </p>
            </div>
          </aside>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          Powered by <span className="font-semibold text-sky-600">RestoSync</span>
        </p>
      </div>
    </div>
  );
};

export default Success;
