import { useStaffAuth } from '../hooks/useStaffAuth';

const WaiterDashboard = () => {
  const { logout, staffUser } = useStaffAuth();

  return (
    <div className="min-h-screen bg-amber-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-amber-200 bg-white p-8 shadow-xl shadow-amber-100/70">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-amber-800">
              Waiter Ops
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Waiter Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              This placeholder is now protected and ready for Phase 3. READY orders will land here after the kitchen handoff flow is built.
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>

        <div className="mt-8 rounded-3xl border border-dashed border-amber-300 bg-amber-50/80 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">
            Auth Check
          </p>
          <p className="mt-3 text-sm text-slate-700">
            Signed in as <span className="font-bold">{staffUser?.email}</span> with role <span className="font-bold">{staffUser?.role}</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WaiterDashboard;
