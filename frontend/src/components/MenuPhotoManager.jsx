import { useEffect, useState } from 'react';
import api from '../utils/api';
import { resolveMenuItemImageUrl } from '../utils/menuItemImages';

const sortMenuItemsForPhotoManager = (items) => (
  [...items].sort((left, right) => {
    const leftHasImage = Boolean(resolveMenuItemImageUrl(left));
    const rightHasImage = Boolean(resolveMenuItemImageUrl(right));

    if (leftHasImage !== rightHasImage) {
      return leftHasImage ? 1 : -1;
    }

    const categoryCompare = String(left.category ?? '').localeCompare(String(right.category ?? ''));
    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return String(left.name ?? '').localeCompare(String(right.name ?? ''));
  })
);

const MenuPhotoManager = ({ restaurantId }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadingItemId, setUploadingItemId] = useState('');

  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!restaurantId) {
        setMenuItems([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/menus/${restaurantId}`);
        setMenuItems(sortMenuItemsForPhotoManager(response.data.data ?? []));
        setError('');
      } catch (fetchError) {
        console.error('Failed to fetch menu items for photo manager:', fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load menu items for photo upload.');
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, [restaurantId]);

  const handleFileSelected = async (menuItemId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploadingItemId(menuItemId);
      setSuccessMessage('');
      setError('');

      const response = await api.patch(`/menus/${menuItemId}`, formData);
      const updatedMenuItem = response.data.data;

      setMenuItems((previousItems) => sortMenuItemsForPhotoManager(
        previousItems.map((menuItem) => (
          String(menuItem._id) === String(menuItemId) ? updatedMenuItem : menuItem
        ))
      ));
      setSuccessMessage(`Photo updated for ${updatedMenuItem.name}.`);
    } catch (uploadError) {
      console.error('Failed to upload menu item image:', uploadError);
      setError(uploadError.response?.data?.message || 'Image upload failed. Please try again.');
    } finally {
      setUploadingItemId('');
    }
  };

  const itemsWithImages = menuItems.filter((menuItem) => Boolean(resolveMenuItemImageUrl(menuItem))).length;

  return (
    <section className="mt-10 overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.1)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.26em] text-slate-400">
            Menu Media
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Upload food photos to Cloudinary
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-slate-500">
            Photos uploaded here are stored in Cloudinary and will appear on the customer menu for this restaurant.
          </p>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-900">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-600">
            Coverage
          </p>
          <p className="mt-1 text-2xl font-black">
            {itemsWithImages}/{menuItems.length}
          </p>
          <p className="mt-1 text-xs font-semibold text-sky-700">
            menu items currently have photos
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-[2rem] bg-slate-100" />
          ))}
        </div>
      ) : menuItems.length === 0 ? (
        <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-500">
            No menu items are available for this restaurant yet.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {menuItems.map((menuItem) => {
            const imageUrl = resolveMenuItemImageUrl(menuItem);
            const isUploading = String(uploadingItemId) === String(menuItem._id);

            return (
              <article
                key={menuItem._id}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg shadow-slate-100/80"
              >
                <div className="h-48 bg-gradient-to-br from-orange-100 via-amber-50 to-white">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={menuItem.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-amber-700 shadow-sm">
                        Missing Photo
                      </span>
                      <p className="text-sm font-semibold text-slate-600">
                        This menu item is live, but it does not have a Cloudinary image yet.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        {menuItem.category}
                      </p>
                      <h3 className="mt-2 text-xl font-black text-slate-950">
                        {menuItem.name}
                      </h3>
                    </div>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-black text-white">
                      ${Number(menuItem.price ?? 0).toFixed(2)}
                    </span>
                  </div>

                  <label className={`mt-5 flex cursor-pointer items-center justify-center rounded-2xl px-4 py-3 text-sm font-black transition ${
                    isUploading
                      ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                      : 'bg-sky-600 text-white hover:bg-sky-700'
                  }`}>
                    {isUploading ? 'Uploading...' : imageUrl ? 'Replace Photo' : 'Upload Photo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(event) => handleFileSelected(menuItem._id, event)}
                    />
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default MenuPhotoManager;
