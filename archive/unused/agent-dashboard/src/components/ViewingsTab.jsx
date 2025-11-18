import { useState, useEffect } from 'react';
import { saveViewings } from '../utils/storage';
import Toast from './Toast';

export default function ViewingsTab({ viewings, onUpdate, onToast }) {
  const [toast, setToast] = useState(null);

  // Listen for localStorage changes (new tenant bookings) - storage events only, no polling
  useEffect(() => {
    const handleStorageChange = () => {
      // Reload viewings when localStorage changes (with slight delay to avoid race conditions)
      setTimeout(() => {
        const updated = JSON.parse(localStorage.getItem('nestfinder_viewings') || '[]');
        onUpdate(updated);
      }, 100);
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [onUpdate]);

  const handleConfirm = (id) => {
    const viewing = viewings.find(v => v.id === id);
    const updated = viewings.map(v =>
      v.id === id ? { ...v, status: 'confirmed', confirmedTime: v.time } : v
    );
    saveViewings(updated);
    onUpdate(updated);
    
    setToast({ message: `Viewing confirmed for ${viewing.tenant} ✅`, type: 'success' });
    if (onToast) onToast(`Viewing confirmed for ${viewing.tenant} ✅`);
  };

  const handleDecline = (id) => {
    const updated = viewings.map(v =>
      v.id === id ? { ...v, status: 'declined' } : v
    );
    saveViewings(updated);
    onUpdate(updated);
    
    const viewing = viewings.find(v => v.id === id);
    setToast({ message: `Viewing declined for ${viewing.tenant}`, type: 'error' });
    if (onToast) onToast(`Viewing declined for ${viewing.tenant}`);
  };

  const pendingViewings = viewings.filter(v => v.status === 'pending');
  const confirmedViewings = viewings.filter(v => v.status === 'confirmed');
  const declinedViewings = viewings.filter(v => v.status === 'declined');

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Viewings</h2>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {viewings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-200">
          <p className="text-slate-500">No viewing requests yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingViewings.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3">Pending</h3>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tenant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Property</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pendingViewings.map((viewing) => (
                        <tr key={viewing.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {viewing.tenant}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-900">{viewing.email || '-'}</div>
                            <div className="text-sm text-slate-500">{viewing.phone || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-900">{viewing.property}</div>
                            <div className="text-sm text-slate-500">{viewing.propertyPostcode}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {viewing.time}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConfirm(viewing.id)}
                                className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition"
                              >
                                ✅ Confirm
                              </button>
                              <button
                                onClick={() => handleDecline(viewing.id)}
                                className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition"
                              >
                                ❌ Decline
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {confirmedViewings.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3">Confirmed</h3>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tenant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Property</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {confirmedViewings.map((viewing) => (
                        <tr key={viewing.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {viewing.tenant}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-900">{viewing.email || '-'}</div>
                            <div className="text-sm text-slate-500">{viewing.phone || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-900">{viewing.property}</div>
                            <div className="text-sm text-slate-500">{viewing.propertyPostcode}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {viewing.time}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              Confirmed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {declinedViewings.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3">Declined</h3>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tenant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Property</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {declinedViewings.map((viewing) => (
                        <tr key={viewing.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {viewing.tenant}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-900">{viewing.email || '-'}</div>
                            <div className="text-sm text-slate-500">{viewing.phone || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-900">{viewing.property}</div>
                            <div className="text-sm text-slate-500">{viewing.propertyPostcode}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {viewing.time}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              Declined
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

