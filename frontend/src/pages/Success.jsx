import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Success = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const jobId        = searchParams.get('jobId');
  const restaurantId = searchParams.get('restaurantId');
  const tableId      = searchParams.get('tableId');

  const menuUrl = `/?restaurantId=${restaurantId}&tableId=${tableId}`;

  const handleDownloadInvoice = () => {
    // Opens the invoice PDF in a new tab directly from the backend
    window.open(`http://localhost:5000/api/orders/${jobId}/invoice`, '_blank');
  };

  const handleBackToMenu = () => {
    navigate(menuUrl);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">

        {/* Success Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">

          {/* Animated Checkmark */}
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 rounded-full p-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-black text-gray-900 mb-2">
            Order Placed Successfully!
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Your order is being prepared. Sit back and relax!
          </p>

          {/* Job ID Badge */}
          {jobId && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
                Queue Job ID
              </p>
              <p className="font-mono text-sm text-gray-700 break-all">{jobId}</p>
            </div>
          )}

          {/* Table Badge */}
          {tableId && (
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-sm font-bold px-4 py-2 rounded-full mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h2a1 1 0 001-1v-1h-3v2zm3-4H6V8h8v2z" clipRule="evenodd" />
              </svg>
              Table #{tableId}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              id="download-invoice-btn"
              onClick={handleDownloadInvoice}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download Invoice
            </button>

            <button
              id="back-to-menu-btn"
              onClick={handleBackToMenu}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 px-4 rounded-xl transition-colors"
            >
              ← Back to Menu
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by <span className="font-semibold text-blue-500">RestoSync</span>
        </p>
      </div>
    </div>
  );
};

export default Success;
