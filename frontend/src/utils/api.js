import axios from 'axios';
import { getStoredStaffToken } from './staffSession';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

const hasAuthorizationHeader = (headers) => {
  if (!headers) {
    return false;
  }

  if (typeof headers.get === 'function') {
    return Boolean(headers.get('Authorization') || headers.get('authorization'));
  }

  return Boolean(headers.Authorization || headers.authorization);
};

api.interceptors.request.use((config) => {
  const token = getStoredStaffToken();

  if (!token) {
    return config;
  }

  config.headers = config.headers ?? {};

  if (!hasAuthorizationHeader(config.headers)) {
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

export default api;
