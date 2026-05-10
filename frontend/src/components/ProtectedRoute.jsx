import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useStaffAuth } from '../hooks/useStaffAuth';
import { getStaffDefaultRoute } from '../utils/staffSession';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const location = useLocation();
  const { isAuthenticated, isInitializing, staffUser } = useStaffAuth();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 px-6 py-5 text-center shadow-2xl shadow-blue-950/20">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-blue-400" />
          <p className="text-sm font-semibold text-slate-200">Checking staff session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !staffUser) {
    return <Navigate to="/staff-login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(staffUser.role)) {
    return <Navigate to={getStaffDefaultRoute(staffUser.role)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
