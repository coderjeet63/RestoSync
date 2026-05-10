import { useEffect, useState } from 'react';
import { StaffAuthContext } from './staffAuthContext';
import api from '../utils/api';
import {
  buildStaffSession,
  clearStaffSessionStorage,
  getStoredStaffToken,
  normalizeStaffUser,
  persistStaffSession,
  readStoredStaffSession,
} from '../utils/staffSession';

export const StaffAuthProvider = ({ children }) => {
  const initialSession = readStoredStaffSession();
  const [staffUser, setStaffUser] = useState(initialSession?.user ?? null);
  const [staffToken, setStaffToken] = useState(initialSession?.token ?? getStoredStaffToken());
  const [isInitializing, setIsInitializing] = useState(true);

  const clearSession = () => {
    clearStaffSessionStorage();
    setStaffToken(null);
    setStaffUser(null);
  };

  const setSession = (session) => {
    persistStaffSession(session);
    setStaffToken(session.token);
    setStaffUser(session.user);
  };

  useEffect(() => {
    const bootstrapStaffSession = async () => {
      const storedToken = getStoredStaffToken();

      if (!storedToken) {
        clearSession();
        setIsInitializing(false);
        return;
      }

      try {
        const response = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        const currentUser = normalizeStaffUser(response.data);
        if (!currentUser) {
          throw new Error('Invalid staff session');
        }

        setSession({ token: storedToken, user: currentUser });
      } catch {
        clearSession();
      } finally {
        setIsInitializing(false);
      }
    };

    bootstrapStaffSession();
  }, []);

  const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    const session = buildStaffSession(response.data);

    if (!session) {
      throw new Error('Invalid login response from server.');
    }

    setSession(session);
    return session.user;
  };

  const logout = () => {
    clearSession();
  };

  const value = {
    isAuthenticated: Boolean(staffToken && staffUser),
    isInitializing,
    login,
    logout,
    staffToken,
    staffUser,
  };

  return (
    <StaffAuthContext.Provider value={value}>
      {children}
    </StaffAuthContext.Provider>
  );
};
