import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { clearCart } from '../store/cartSlice';

// ─── Sub-component: Empty Cart State ────────────────────────────────────────
const EmptyCart = ({ menuUrl }) => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <div className="max-w-sm w-full bg-white p-8 rounded-2xl shadow-lg text-center">
      <div className="text-gray-300 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
      <p className="text-gray-500 mb-6 text-sm">Add some items to your cart before checking out.</p>
      <Link
        to={menuUrl}
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-xl transition-colors"
      >
        ← Back to Menu
      </Link>
    </div>
  </div>
);

// ─── Sub-component: Step Indicator ──────────────────────────────────────────
const StepIndicator = ({ step }) => (
  <div className="flex items-center justify-center gap-3 mb-8">
    {[1, 2, 3].map((s) => (
      <React.Fragment key={s}>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
          {s}
        </div>
        {s < 3 && (
          <div className={`h-0.5 w-10 transition-colors ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const restaurantId = searchParams.get('restaurantId');
  const tableId = searchParams.get('tableId');
  const menuUrl = `/?restaurantId=${restaurantId}&tableId=${tableId}`;

  // Redux cart state
  const { items, totalAmount } = useSelector((state) => state.cart);

  // ─── Step state: 1=details, 2=otp, 3=confirm ──────────────────────────
  const [step, setStep] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Empty cart guard
  if (items.length === 0) {
    return <EmptyCart menuUrl={menuUrl} />;
  }

  // ─── Step 1 → Step 2: Request OTP ─────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!customerName.trim()) { setError('Please enter your name.'); return; }
    if (!phone.trim()) { setError('Please enter your phone number.'); return; }

    try {
      setLoading(true);
      await api.post('/customer/auth/request-otp', { phoneNumber: phone });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2 → Step 3: Verify OTP ──────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) { setError('Please enter the OTP.'); return; }

    try {
      setLoading(true);
      const response = await api.post('/customer/auth/verify-otp', { phoneNumber: phone, otp });
      localStorage.setItem('customerToken', response.data.token);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 3: Place Order ───────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    setError('');
    const customerToken = localStorage.getItem('customerToken');
    if (!customerToken) {
      setError('Authentication expired. Please restart checkout.');
      setStep(1);
      return;
    }

    // Map Redux cart items → backend schema (menuItemId is the correct field)
    const orderItems = items.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
    }));

    try {
      setLoading(true);
      const response = await api.post(
        '/orders',
        {
          restaurantId,
          tableId,
          customerName,
          items: orderItems,
          totalAmount,
          orderType: tableId ? 'DINE_IN' : 'TAKEAWAY',
        },
        {
          headers: { Authorization: `Bearer ${customerToken}` },
        }
      );

      dispatch(clearCart());
      // Backend returns { jobId, status, message } — redirect to payment gateway
      navigate(`/payment?orderId=${response.data.jobId}&restaurantId=${restaurantId}&tableId=${tableId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Shared error banner ───────────────────────────────────────────────
  const ErrorBanner = () =>
    error ? (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
        {error}
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Link to={menuUrl} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm font-medium">
            ← Back to Menu
          </Link>
          <h1 className="text-lg font-black text-blue-600">Checkout</h1>
          {tableId && (
            <div className="bg-blue-50 px-3 py-1 rounded-full text-blue-700 text-xs font-bold border border-blue-100">
              Table #{tableId}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        <StepIndicator step={step} />

        {/* ── CART SUMMARY (always visible) ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 100-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
            </svg>
            Order Summary
          </h2>

          <ul className="divide-y divide-gray-50 mb-4">
            {items.map((item) => (
              <li key={item.menuItemId} className="flex justify-between py-2.5 text-sm">
                <span className="text-gray-700 font-medium">
                  {item.name}
                  <span className="ml-2 text-gray-400 font-normal">× {item.quantity}</span>
                </span>
                <span className="text-gray-800 font-semibold">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <span className="font-bold text-gray-800">Total</span>
            <span className="text-2xl font-black text-blue-600">${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* ── STEP 1: Name + Phone ── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-gray-800 mb-4">Your Details</h2>
            <ErrorBanner />
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="customerName"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Sending OTP...</>
                ) : (
                  'Send OTP →'
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2: OTP Verification ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-gray-800 mb-1">Verify OTP</h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter the 4-digit OTP sent to <span className="font-semibold text-gray-700">{phone}</span>.
              <br />
              <span className="text-xs text-blue-500">(Dev mode: OTP is always <strong>1234</strong>)</span>
            </p>
            <ErrorBanner />
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="Enter 4-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-center tracking-widest font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Verifying...</>
                ) : (
                  'Verify OTP →'
                )}
              </button>
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); setOtp(''); }}
                className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium py-2"
              >
                ← Change phone number
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 3: Confirm Order ── */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-gray-800 mb-1">Confirm Your Order</h2>
            <p className="text-sm text-gray-500 mb-4">
              Placing order as <span className="font-semibold text-gray-700">{customerName}</span>
              {tableId && <> at <span className="font-semibold text-gray-700">Table #{tableId}</span></>}.
            </p>
            <ErrorBanner />
            <button
              id="confirm-order-btn"
              onClick={handlePlaceOrder}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-4 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
            >
              {loading ? (
                <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> Placing Order...</>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Confirm &amp; Place Order
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
