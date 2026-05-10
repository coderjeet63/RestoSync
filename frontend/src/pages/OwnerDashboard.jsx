import { useState, useEffect } from 'react';
import { useStaffAuth } from '../hooks/useStaffAuth';
import api from '../utils/api';

const StatCard = ({ label, value, description, trend, iconBg }) => (
  <div className="group relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.1)] backdrop-blur-xl transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-200/50">
    <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-slate-50 transition-transform group-hover:scale-150" />
    
    <div className="relative">
      <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg} shadow-inner`}>
        {label === 'Total Revenue' && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {label === 'Total Orders' && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        )}
        {label === 'Avg Prep Time' && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
        {label}
      </p>
      
      <div className="mt-4 flex items-baseline gap-2">
        <h3 className="text-4xl font-black tracking-tight text-slate-900">
          {value}
        </h3>
        {trend && (
          <span className="text-sm font-bold text-emerald-500">{trend}</span>
        )}
      </div>

      <p className="mt-2 text-sm font-medium text-slate-500">
        {description}
      </p>
    </div>
  </div>
);

const OwnerDashboard = () => {
  const { logout, staffUser } = useStaffAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await api.get('/analytics/dashboard');
        setStats(response.data.data);
        setError('');
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        setError('Unable to load dashboard metrics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.1),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(79,70,229,0.05),_transparent_40%),_#f8fafc] px-6 py-12">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <header className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                Live Insights Console
              </p>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Restaurant Overview
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right lg:block">
              <p className="text-sm font-black text-slate-900">{staffUser?.email}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{staffUser?.role}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="group flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-950 hover:ring-slate-950"
              title="Sign out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600 transition-colors group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-8 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-[2.5rem] bg-white/50 ring-1 ring-slate-100" />
            ))
          ) : (
            <>
              <StatCard
                label="Total Revenue"
                value={`$${stats?.totalRevenue.toFixed(2)}`}
                description="Total gross revenue from all successful orders."
                iconBg="bg-blue-600"
              />
              <StatCard
                label="Total Orders"
                value={stats?.totalOrders}
                description="Total volume of orders processed (excluding pending)."
                iconBg="bg-indigo-600"
              />
              <StatCard
                label="Avg Prep Time"
                value={`${stats?.averageTAT} min`}
                description="Average time taken from order creation to delivery."
                iconBg="bg-emerald-600"
              />
            </>
          )}
        </div>

        {/* Footer/Context */}
        <footer className="mt-16 border-t border-slate-200 pt-8 text-center">
          <p className="text-sm font-medium text-slate-400">
            Data updates in real-time as orders move through the kitchen lifecycle.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default OwnerDashboard;
