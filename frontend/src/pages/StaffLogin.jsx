import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useStaffAuth } from '../hooks/useStaffAuth';
import { getStaffDefaultRoute } from '../utils/staffSession';

const StaffLogin = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isInitializing, login, staffUser } = useStaffAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 px-6 py-5 text-center shadow-2xl shadow-blue-950/20">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-blue-400" />
          <p className="text-sm font-semibold text-slate-200">Restoring staff session...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && staffUser) {
    return <Navigate to={getStaffDefaultRoute(staffUser.role)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const authenticatedUser = await login(formData);
      navigate(getStaffDefaultRoute(authenticatedUser.role), { replace: true });
    } catch (err) {
      console.error('Staff login failed:', err);
      setError(err.response?.data?.message || err.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.28),_transparent_45%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(2,6,23,1))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/95 p-8 shadow-2xl shadow-blue-950/30 backdrop-blur">
        <div className="mb-8">
          <p className="mb-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
            Staff Access
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Sign in to your staff workspace
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Chef, waiter, and owner accounts all sign in here and land on their role-specific dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="chef@restosync.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Signing in...' : 'Open Staff Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StaffLogin;
