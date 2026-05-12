import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/cartSlice';
import { resolveMenuItemImageUrl } from '../utils/menuItemImages';

const MenuItemCard = ({ item }) => {
  const dispatch = useDispatch();
  const resolvedImageUrl = resolveMenuItemImageUrl(item);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [resolvedImageUrl]);

  const handleAddToCart = () => {
    dispatch(
      addToCart({
        menuItemId: item._id,
        name: item.name,
        price: item.price,
      })
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-100">
      <div className="h-48 w-full bg-gradient-to-br from-orange-100 via-amber-50 to-white relative">
        {resolvedImageUrl && !hasImageError ? (
          <img
            src={resolvedImageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-amber-700">
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] shadow-sm">
              Photo Pending
            </span>
            <p className="text-sm font-semibold text-slate-600">
              Upload a food picture for this item from the owner dashboard.
            </p>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-lg text-sm font-bold text-blue-600 shadow-sm">
          ${Number(item.price ?? 0).toFixed(2)}
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-1">{item.name}</h3>
        <p className="text-gray-600 text-sm line-clamp-2 mb-4 h-10">
          {item.description || 'No description available for this item.'}
        </p>
        
        <button
          onClick={handleAddToCart}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 100-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
          </svg>
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default MenuItemCard;
