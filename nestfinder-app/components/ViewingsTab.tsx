'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface Viewing {
  id: number;
  tenant_name: string;
  property_title: string;
  property_postcode: string;
  requested_time: string;
  requested_date?: string;
  status: 'pending' | 'confirmed' | 'declined';
}

interface ViewingsTabProps {
  onToast: (message: string, type?: 'success' | 'error') => void;
}

export default function ViewingsTab({ onToast }: ViewingsTabProps) {
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    loadViewings();
    // Poll for new viewings
    const interval = setInterval(loadViewings, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadViewings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/viewings`);
      setViewings(response.data);
    } catch (error) {
      console.error('Failed to load viewings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateViewingStatus = async (
    viewingId: number,
    status: 'confirmed' | 'declined' | 'suggested',
    suggestedTime?: string
  ) => {
    try {
      await axios.patch(
        `${API_URL}/api/viewings/${viewingId}`,
        { status, suggested_time: suggestedTime }
      );

      onToast(
        status === 'confirmed'
          ? 'Viewing confirmed ✅'
          : status === 'declined'
          ? 'Viewing declined'
          : 'Alternative time suggested'
      );
      loadViewings();
    } catch (error) {
      onToast('Failed to update viewing', 'error');
    }
  };

  const handleSuggestTime = (viewingId: number) => {
    const suggestedTime = prompt('Enter suggested time (HH:MM):');
    if (suggestedTime) {
      updateViewingStatus(viewingId, 'suggested', suggestedTime);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading viewings...</div>;
  }

  const groupedViewings = viewings.reduce((acc, viewing) => {
    if (!acc[viewing.property_title]) {
      acc[viewing.property_title] = [];
    }
    acc[viewing.property_title].push(viewing);
    return acc;
  }, {} as Record<string, Viewing[]>);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Viewings</h2>

      {Object.keys(groupedViewings).length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-slate-500">No viewing requests yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedViewings).map(([propertyTitle, propertyViewings]) => (
            <div key={propertyTitle} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">{propertyTitle}</h3>
              </div>
              <div className="divide-y divide-slate-200">
                {propertyViewings.map((viewing) => (
                  <div key={viewing.id} className="px-6 py-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-slate-900">{viewing.tenant_name}</div>
                        <div className="text-sm text-slate-500">
                          {viewing.property_postcode}
                          {viewing.requested_date && (
                            <> • {new Date(viewing.requested_date).toLocaleDateString('en-GB', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}</>
                          )}
                          {' • '}{viewing.requested_time}
                        </div>
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
                    {viewing.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => updateViewingStatus(viewing.id, 'confirmed')}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition"
                        >
                          ✅ Confirm
                        </button>
                        <button
                          onClick={() => handleSuggestTime(viewing.id)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
                        >
                          ⚙️ Suggest
                        </button>
                        <button
                          onClick={() => updateViewingStatus(viewing.id, 'declined')}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition"
                        >
                          ❌ Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

