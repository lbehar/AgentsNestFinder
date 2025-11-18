'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface SuggestTimeModalProps {
  viewing: {
    id: number;
    property_id: number;
  };
  onSelect: (time: string) => void;
  onClose: () => void;
}

export default function SuggestTimeModal({ viewing, onSelect, onClose }: SuggestTimeModalProps) {
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    loadAvailableSlots();
  }, [viewing.property_id]);

  const loadAvailableSlots = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/properties/${viewing.property_id}/available-slots`);
      setAvailableSlots(response.data.slots);
    } catch (error) {
      console.error('Failed to load available slots:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-900">Suggest Alternative Time</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading available slots...</div>
        ) : availableSlots.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No available slots at this time
          </div>
        ) : (
          <>
            <p className="text-slate-600 mb-4">Select an alternative time slot:</p>
            <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => onSelect(slot)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-primary-500 hover:text-white transition"
                >
                  {slot}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


