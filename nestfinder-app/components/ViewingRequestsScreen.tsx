'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import SuggestTimeModal from './SuggestTimeModal';

interface Viewing {
  id: number;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  property_title: string;
  property_postcode: string;
  requested_time: string;
  status: string;
  move_in_date?: string;
  occupants?: number;
  rent_budget?: number;
  message?: string;
  suggested_time?: string;
}

interface FeasibilityStatus {
  status: 'ok' | 'tight' | 'conflict';
  label: string;
  color: string;
  reason?: string;
  travel_time?: number;
}

interface ViewingRequestsScreenProps {
  onToast: (message: string, type?: 'success' | 'error') => void;
}

export default function ViewingRequestsScreen({ onToast }: ViewingRequestsScreenProps) {
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [selectedViewing, setSelectedViewing] = useState<Viewing | null>(null);
  const [feasibilityStatuses, setFeasibilityStatuses] = useState<Record<number, FeasibilityStatus>>({});

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    loadViewings();
    // Poll for new viewings every 10 seconds
    const interval = setInterval(loadViewings, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadViewings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/viewings`);
      setViewings(response.data);
      
      // Load feasibility statuses for pending viewings
      const pendingViewings = response.data.filter((v: Viewing) => v.status === 'pending');
      const statuses: Record<number, FeasibilityStatus> = {};
      
      for (const viewing of pendingViewings) {
        try {
          const feasibilityRes = await axios.get(`${API_URL}/api/viewings/${viewing.id}/feasibility`);
          statuses[viewing.id] = feasibilityRes.data;
        } catch (error) {
          // If feasibility check fails, default to OK
          statuses[viewing.id] = { status: 'ok', label: 'OK', color: '#4caf50' };
        }
      }
      
      setFeasibilityStatuses(statuses);
    } catch (error) {
      console.error('Failed to load viewings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (viewingId: number) => {
    try {
      await axios.patch(`${API_URL}/api/viewings/${viewingId}`, {
        status: 'confirmed',
      });
      onToast('Viewing confirmed ✅');
      loadViewings();
    } catch (error) {
      onToast('Failed to confirm viewing', 'error');
    }
  };

  const handleSuggest = (viewing: Viewing) => {
    setSelectedViewing(viewing);
    setSuggestModalOpen(true);
  };

  const handleDecline = async (viewingId: number) => {
    try {
      await axios.patch(`${API_URL}/api/viewings/${viewingId}`, {
        status: 'declined',
      });
      onToast('Viewing declined');
      loadViewings();
    } catch (error) {
      onToast('Failed to decline viewing', 'error');
    }
  };

  const handleMessage = (tenantEmail: string) => {
    if (!tenantEmail) {
      onToast('No email address available', 'error');
      return;
    }
    // Open email client with tenant's email pre-filled
    window.location.href = `mailto:${encodeURIComponent(tenantEmail)}`;
  };

  const handleSuggestTimeSelected = async (time: string) => {
    if (!selectedViewing) return;

    try {
      await axios.patch(`${API_URL}/api/viewings/${selectedViewing.id}`, {
        status: 'pending',
        suggested_time: time,
      });
      onToast('Alternative time suggested');
      setSuggestModalOpen(false);
      setSelectedViewing(null);
      loadViewings();
    } catch (error) {
      onToast('Failed to suggest time', 'error');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-500">Loading viewings...</div>
    );
  }

  const pendingCount = viewings.filter(v => v.status === 'pending').length;
  const confirmedCount = viewings.filter(v => v.status === 'confirmed').length;
  const todayViewings = viewings.filter(v => {
    if (v.status !== 'confirmed') return false;
    // For MVP, assume confirmed viewings are for today
    return true;
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Viewing Requests</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Pending Requests</p>
              <p className="text-3xl font-bold text-slate-900">{pendingCount}</p>
            </div>
            <div className="text-4xl">⏳</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Confirmed Today</p>
              <p className="text-3xl font-bold text-slate-900">{todayViewings.length}</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Total Confirmed</p>
              <p className="text-3xl font-bold text-slate-900">{confirmedCount}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>
      </div>

      {viewings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-slate-500">No viewing requests yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {viewings.map((viewing) => (
            <div
              key={viewing.id}
              className="bg-white rounded-xl shadow-sm p-6 border border-slate-200"
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                {/* Left: Property and Time */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {viewing.property_title}
                      </h3>
                      <p className="text-sm text-slate-500">{viewing.property_postcode}</p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        viewing.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : viewing.status === 'declined'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {viewing.status}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-slate-700">Requested Time</p>
                      {viewing.status === 'pending' && feasibilityStatuses[viewing.id] && (
                        <span
                          className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                          style={{ backgroundColor: feasibilityStatuses[viewing.id].color }}
                        >
                          {feasibilityStatuses[viewing.id].label}
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-semibold text-slate-900">{viewing.requested_time}</p>
                    {viewing.suggested_time && (
                      <p className="text-sm text-blue-600 mt-1">
                        Suggested: {viewing.suggested_time}
                      </p>
                    )}
                    {viewing.status === 'pending' && 
                     feasibilityStatuses[viewing.id]?.status === 'tight' &&
                     feasibilityStatuses[viewing.id]?.travel_time && (
                      <p className="text-xs text-slate-500 mt-1">
                        Travel time: {feasibilityStatuses[viewing.id].travel_time} min
                      </p>
                    )}
                  </div>

                  {/* Smart Profile */}
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Tenant Submission</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Name:</span>{' '}
                        <span className="text-slate-900 font-medium">{viewing.tenant_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Email:</span>{' '}
                        <span className="text-slate-900">{viewing.tenant_email}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Phone:</span>{' '}
                        <span className="text-slate-900">{viewing.tenant_phone}</span>
                      </div>
                      {viewing.move_in_date && (
                        <div>
                          <span className="text-slate-500">Move-In Date:</span>{' '}
                          <span className="text-slate-900">
                            {new Date(viewing.move_in_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {viewing.occupants && (
                        <div>
                          <span className="text-slate-500">Occupants:</span>{' '}
                          <span className="text-slate-900">{viewing.occupants}</span>
                        </div>
                      )}
                      {viewing.rent_budget && (
                        <div>
                          <span className="text-slate-500">Rent Budget:</span>{' '}
                          <span className="text-slate-900">
                            £{viewing.rent_budget.toLocaleString()}/month
                          </span>
                        </div>
                      )}
                    </div>
                    {viewing.message && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <span className="text-slate-500 text-sm">Message:</span>
                        <p className="text-slate-900 text-sm mt-1">{viewing.message}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col gap-2 md:min-w-[140px]">
                  {viewing.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleConfirm(viewing.id)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition"
                      >
                        ✅ Confirm
                      </button>
                      <button
                        onClick={() => handleSuggest(viewing)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
                      >
                        ⚙️ Suggest
                      </button>
                      <button
                        onClick={() => handleDecline(viewing.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition"
                      >
                        ❌ Decline
                      </button>
                    </>
                  )}
                  {viewing.tenant_email && (
                    <button
                      onClick={() => handleMessage(viewing.tenant_email)}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition"
                    >
                      ✉️ Message
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestModalOpen && selectedViewing && (
        <SuggestTimeModal
          viewing={selectedViewing}
          onSelect={handleSuggestTimeSelected}
          onClose={() => {
            setSuggestModalOpen(false);
            setSelectedViewing(null);
          }}
        />
      )}
    </div>
  );
}

