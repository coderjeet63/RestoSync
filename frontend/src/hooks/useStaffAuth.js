import { useContext } from 'react';
import { StaffAuthContext } from '../context/staffAuthContext';

export const useStaffAuth = () => {
  const context = useContext(StaffAuthContext);

  if (!context) {
    throw new Error('useStaffAuth must be used within a StaffAuthProvider');
  }

  return context;
};
