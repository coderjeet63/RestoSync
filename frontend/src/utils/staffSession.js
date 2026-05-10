export const STAFF_TOKEN_STORAGE_KEY = 'restosync.staffToken';
export const STAFF_USER_STORAGE_KEY = 'restosync.staffUser';
const LEGACY_STAFF_TOKEN_STORAGE_KEY = 'token';

const STAFF_DEFAULT_ROUTES = {
  OWNER: '/admin',
  MANAGER: '/admin',
  CHEF: '/kds',
  WAITER: '/waiter',
};

const isBrowser = typeof window !== 'undefined';

export const getStaffDefaultRoute = (role) => STAFF_DEFAULT_ROUTES[role] ?? '/staff-login';

export const normalizeStaffUser = (user) => {
  if (!user?._id || !user?.email || !user?.role || !user?.restaurantId) {
    return null;
  }

  return {
    _id: String(user._id),
    email: user.email,
    role: user.role,
    restaurantId: String(user.restaurantId),
  };
};

export const buildStaffSession = (payload) => {
  const token = payload?.token;
  const user = normalizeStaffUser(payload);

  if (!token || !user) {
    return null;
  }

  return { token, user };
};

export const getStoredStaffToken = () => {
  if (!isBrowser) {
    return null;
  }

  return localStorage.getItem(STAFF_TOKEN_STORAGE_KEY)
    || localStorage.getItem(LEGACY_STAFF_TOKEN_STORAGE_KEY)
    || null;
};

export const readStoredStaffUser = () => {
  if (!isBrowser) {
    return null;
  }

  const rawUser = localStorage.getItem(STAFF_USER_STORAGE_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return normalizeStaffUser(JSON.parse(rawUser));
  } catch {
    return null;
  }
};

export const readStoredStaffSession = () => {
  const token = getStoredStaffToken();
  const user = readStoredStaffUser();

  if (!token || !user) {
    return null;
  }

  return { token, user };
};

export const persistStaffSession = (session) => {
  if (!isBrowser || !session?.token || !session?.user) {
    return;
  }

  localStorage.setItem(STAFF_TOKEN_STORAGE_KEY, session.token);
  localStorage.setItem(STAFF_USER_STORAGE_KEY, JSON.stringify(session.user));
  localStorage.removeItem(LEGACY_STAFF_TOKEN_STORAGE_KEY);
};

export const clearStaffSessionStorage = () => {
  if (!isBrowser) {
    return;
  }

  localStorage.removeItem(STAFF_TOKEN_STORAGE_KEY);
  localStorage.removeItem(STAFF_USER_STORAGE_KEY);
  localStorage.removeItem(LEGACY_STAFF_TOKEN_STORAGE_KEY);
};
