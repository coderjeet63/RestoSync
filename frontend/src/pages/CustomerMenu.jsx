import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../utils/api';
import MenuItemCard from '../components/MenuItemCard';

const CustomerMenu = () => {
  const [searchParams] = useSearchParams();
  const navigate     = useNavigate();
  const restaurantId = searchParams.get('restaurantId');
  const tableId      = searchParams.get('tableId');

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cart = useSelector((state) => state.cart);
  const totalItems = cart.items.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const fetchMenu = async () => {
      if (!restaurantId) {
        setError('Missing restaurant information. Please scan a valid QR code.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/public/menu/${restaurantId}`);
        setMenuItems(response.data.data); // Backend returns { success, source, data: [...] }
        setError(null);
      } catch (err) {
        console.error('❌ Fetch Menu Error:', err.message);
        setError(err.response?.data?.message || 'Failed to load menu. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading delicious menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg text-center border border-red-100">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 15c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 px-4 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black text-blue-600">RestoSync</h1>
          {tableId && (
            <div className="bg-blue-50 px-3 py-1 rounded-full text-blue-700 text-sm font-bold border border-blue-100">
              Table #{tableId}
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-blue-600 text-white py-10 px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">Welcome!</h2>
          <p className="text-blue-100">Explore our delicious items and order directly from your table.</p>
        </div>
      </div>

      {/* Menu Grid */}
      <main className="max-w-7xl mx-auto px-4">
        {menuItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No items available in the menu right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <MenuItemCard key={item._id} item={item} />
            ))}
          </div>
        )}
      </main>

      {/* Floating Cart Summary */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-20">
          <div className="bg-blue-600 text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between border-2 border-blue-400">
            <div className="flex items-center gap-3">
              <div className="bg-white text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                {totalItems}
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-blue-200 leading-tight">Total items</p>
                <p className="text-xl font-bold">${cart.totalAmount.toFixed(2)}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/checkout?restaurantId=${restaurantId}&tableId=${tableId}`)}
              className="bg-white text-blue-600 hover:bg-blue-50 font-black py-2 px-6 rounded-xl transition-colors shadow-sm"
            >
              View Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;
