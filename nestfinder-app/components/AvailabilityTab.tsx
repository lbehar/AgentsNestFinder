'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface AvailabilityRule {
  day_of_week: number; // 0=Monday, 1=Tuesday, ..., 6=Sunday
  enabled: boolean;
  start_time: string;
  end_time: string;
}

interface AvailabilityTabProps {
  onToast: (message: string, type?: 'success' | 'error') => void;
}

interface Blockout {
  id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  full_day: boolean;
}

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function AvailabilityTab({ onToast }: AvailabilityTabProps) {
  const [availability, setAvailability] = useState<AvailabilityRule[]>([]);
  const [blockouts, setBlockouts] = useState<Blockout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBlockoutModal, setShowBlockoutModal] = useState(false);
  const [blockoutForm, setBlockoutForm] = useState({
    date: '',
    start_time: '',
    end_time: '',
    full_day: false,
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    loadAvailability();
    loadBlockouts();
  }, []);

  const loadAvailability = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/availability`);
      // Ensure we have all 7 days, sorted by day_of_week
      let rules = response.data || [];
      if (rules.length < 7) {
        // Fill in missing days
        const existingDays = new Set(rules.map((r: AvailabilityRule) => r.day_of_week));
        for (let day = 0; day < 7; day++) {
          if (!existingDays.has(day)) {
            rules.push({
              day_of_week: day,
              enabled: true, // All days enabled by default
              start_time: '09:00',
              end_time: '18:00',
            });
          }
        }
        rules.sort((a: AvailabilityRule, b: AvailabilityRule) => a.day_of_week - b.day_of_week);
      }
      setAvailability(rules);
    } catch (error) {
      // Initialize with default values if no availability set
      const defaultAvailability: AvailabilityRule[] = DAY_NAMES.map((_, index) => ({
        day_of_week: index,
        enabled: true, // All days enabled by default
        start_time: '09:00',
        end_time: '18:00',
      }));
      setAvailability(defaultAvailability);
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async () => {
    try {
      await axios.put(`${API_URL}/api/availability`, { availability });
      onToast('Availability updated ✅');
    } catch (error: any) {
      onToast(error.response?.data?.detail || 'Failed to update availability', 'error');
    }
  };

  const updateDay = (dayOfWeek: number, field: string, value: any) => {
    setAvailability(
      availability.map((a) => (a.day_of_week === dayOfWeek ? { ...a, [field]: value } : a))
    );
  };

  const loadBlockouts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/blockouts`);
      setBlockouts(response.data || []);
    } catch (error) {
      console.error('Failed to load blockouts:', error);
      setBlockouts([]);
    }
  };

  const handleAddBlockout = async () => {
    if (!blockoutForm.date) {
      onToast('Please select a date', 'error');
      return;
    }

    if (!blockoutForm.full_day && (!blockoutForm.start_time || !blockoutForm.end_time)) {
      onToast('Please select start and end times', 'error');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/blockouts`, {
        date: blockoutForm.date,
        start_time: blockoutForm.full_day ? null : blockoutForm.start_time,
        end_time: blockoutForm.full_day ? null : blockoutForm.end_time,
        full_day: blockoutForm.full_day,
      });
      onToast('Blockout added ✅');
      setShowBlockoutModal(false);
      setBlockoutForm({ date: '', start_time: '', end_time: '', full_day: false });
      loadBlockouts();
    } catch (error: any) {
      console.error('Blockout creation error:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to add blockout. Make sure the backend server is running.';
      onToast(errorMessage, 'error');
    }
  };

  const handleDeleteBlockout = async (blockoutId: number) => {
    try {
      await axios.delete(`${API_URL}/api/blockouts/${blockoutId}`);
      onToast('Blockout deleted ✅');
      loadBlockouts();
    } catch (error: any) {
      onToast(error.response?.data?.detail || 'Failed to delete blockout', 'error');
    }
  };

  const formatBlockoutDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${dayNames[date.getDay()]} ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading availability...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Availability</h2>
        <button
          onClick={updateAvailability}
          className="px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition"
        >
          Save Changes
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-200">
          {availability.map((rule) => (
            <div key={rule.day_of_week} className="px-6 py-4 flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => updateDay(rule.day_of_week, 'enabled', e.target.checked)}
                  className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                />
                <label className="font-medium text-slate-900 w-28">
                  {DAY_NAMES[rule.day_of_week]}
                </label>
              </div>
              {rule.enabled && (
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-600">Start:</label>
                  <input
                    type="time"
                    value={rule.start_time}
                    onChange={(e) => updateDay(rule.day_of_week, 'start_time', e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <label className="text-sm text-slate-600">End:</label>
                  <input
                    type="time"
                    value={rule.end_time}
                    onChange={(e) => updateDay(rule.day_of_week, 'end_time', e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}
              {!rule.enabled && (
                <span className="text-sm text-slate-400 italic">(Day off)</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Blocked Times Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Blocked Times</h3>
          <button
            onClick={() => setShowBlockoutModal(true)}
            className="px-4 py-2 bg-slate-500 text-white rounded-lg text-sm font-medium hover:bg-slate-600 transition"
          >
            + Add Block
          </button>
        </div>

        {blockouts.length === 0 ? (
          <div className="bg-slate-50 rounded-lg p-4 text-center text-slate-500 text-sm">
            No blocked times. Click "+ Add Block" to block specific dates or time ranges.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-200">
              {blockouts.map((blockout) => (
                <div key={blockout.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900">
                      {formatBlockoutDate(blockout.date)}
                    </span>
                    {blockout.full_day ? (
                      <span className="ml-2 text-sm text-slate-600">(all day)</span>
                    ) : (
                      <span className="ml-2 text-sm text-slate-600">
                        {blockout.start_time} - {blockout.end_time}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteBlockout(blockout.id)}
                    className="text-red-500 hover:text-red-700 transition"
                    title="Delete blockout"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Blockout Modal */}
      {showBlockoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Add Blocked Time</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={blockoutForm.date}
                  onChange={(e) => setBlockoutForm({ ...blockoutForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={blockoutForm.full_day}
                    onChange={(e) => setBlockoutForm({ ...blockoutForm, full_day: e.target.checked })}
                    className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Block entire day</span>
                </label>
              </div>

              {!blockoutForm.full_day && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={blockoutForm.start_time}
                      onChange={(e) => setBlockoutForm({ ...blockoutForm, start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={blockoutForm.end_time}
                      onChange={(e) => setBlockoutForm({ ...blockoutForm, end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddBlockout}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowBlockoutModal(false);
                    setBlockoutForm({ date: '', start_time: '', end_time: '', full_day: false });
                  }}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

