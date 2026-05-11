import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Payment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderId = searchParams.get('orderId');
  const restaurantId = searchParams.get('restaurantId');
  const tableId = searchParams.get('tableId');

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // ─── Missing orderId guard ─────────────────────────────────────────────
  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white p-8 rounded-2xl shadow-lg text-center border border-red-100">
          <div className="text-red-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 15c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Order Found</h2>
          <p className="text-gray-500 text-sm mb-6">We couldn't find an order to pay for. Please go back and try again.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-xl transition-colors"
          >
            ← Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // ─── Stripe payment handler ──────────────────────────────────────────────
  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      setError('');

      // Create Stripe Checkout Session
      const response = await api.post('/payments/create-checkout-session', { orderId });

      if (response.data.url) {
        // Redirect to Stripe Hosted Checkout
        window.location.href = response.data.url;
      } else {
        throw new Error('Could not initialize payment session.');
      }
    } catch (err) {
      console.error('❌ Payment Error:', err);
      setError(err.response?.data?.message || 'Payment initialization failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">

        {/* Payment Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-white/20 rounded-2xl p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-black text-white">Complete Your Payment</h1>
            <p className="text-blue-200 text-sm mt-1">RestoSync Secure Checkout</p>
          </div>

          {/* Body */}
          <div className="p-6">

            {/* Order ID Badge */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
                Order Reference
              </p>
              <p className="font-mono text-sm text-gray-700 break-all">{orderId}</p>
            </div>

            {/* Stripe Branding */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100 flex items-center gap-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <svg viewBox="0 0 40 40" className="h-5 w-5 fill-white">
                  <path d="M32.8 19.3c0-4.6-2.3-7.1-6.6-7.1-2.1 0-3.9.7-5.1 1.5l-.6-1.1h-4.3v17.4l4.8-1v-4.5c.9.6 2.3 1.1 3.9 1.1 4.5 0 7.9-2.2 7.9-6.3zm-4.8 0c0 2.2-1.3 3.3-3.1 3.3-1.1 0-2.1-.3-2.7-.8v-4.8c.7-.6 1.8-1 2.9-1 1.7.1 2.9 1.1 2.9 3.3zM14.6 19.1c0-2.6-1.4-3.7-3.6-3.7-1.1 0-2.1.3-2.7.8v6.2c.6.5 1.7.8 2.8.8 2.3 0 3.5-1.1 3.5-4.1zm-8.3-6.4h4.3l.5 1.1c1.1-.8 2.7-1.5 4.8-1.5 4.3 0 6.6 2.5 6.6 7.1 0 4.1-3.4 6.3-7.9 6.3-1.6 0-3-.5-3.9-1.1v9.8l-4.4.9V12.7z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">Powered by Stripe</p>
                <p className="text-[11px] text-blue-600">Secure 128-bit SSL encrypted payment</p>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
                {error}
              </div>
            )}

            {/* Pay Button */}
            <button
              id="pay-now-btn"
              onClick={handlePayment}
              disabled={isProcessing}
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 ${
                isProcessing
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-green-200 active:scale-[0.98]'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400" />
                  Redirecting...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Pay Now
                </>
              )}
            </button>

            {/* Disclaimer */}
            <p className="text-center text-[11px] text-gray-400 mt-4">
              🔒 You will be redirected to Stripe to complete your payment securely.
            </p>
          </div>
        </div>


        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by <span className="font-semibold text-blue-500">RestoSync</span>
        </p>
      </div>
    </div>
  );
};

export default Payment;
