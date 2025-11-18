export default function DashboardTab({ properties, viewings }) {
  const activeProperties = properties.filter(p => p.status === 'active').length;
  const pendingViewings = viewings.filter(v => v.status === 'pending').length;

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Active Properties</p>
              <p className="text-3xl font-bold text-slate-900">{activeProperties}</p>
            </div>
            <div className="text-4xl">🏘️</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Pending Viewings</p>
              <p className="text-3xl font-bold text-slate-900">{pendingViewings}</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>
      </div>
    </div>
  );
}

