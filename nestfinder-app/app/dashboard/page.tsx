'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import ViewingRequestsScreen from '@/components/ViewingRequestsScreen';
import ScheduleScreen from '@/components/ScheduleScreen';
import PropertiesTab from '@/components/PropertiesTab';
import AvailabilityTab from '@/components/AvailabilityTab';
import Toast from '@/components/Toast';

export default function DashboardPage() {
  const [view, setView] = useState<'requests' | 'schedule' | 'properties' | 'availability'>('requests');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [agency, setAgency] = useState<any>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    loadAgency();
  }, []);

  const loadAgency = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/agency`);
      setAgency(response.data);
    } catch (error) {
      setAgency({
        name: 'My Agency',
        slug: 'myagency',
      });
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">🏠 NestFinder</h1>
              <p className="text-sm text-slate-600">{agency?.name || 'Agency'}</p>
            </div>
            
            {/* View Toggle */}
            <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setView('requests')}
                className={`px-4 py-2 rounded-md font-medium text-sm transition ${
                  view === 'requests'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Requests
              </button>
              <button
                onClick={() => setView('schedule')}
                className={`px-4 py-2 rounded-md font-medium text-sm transition ${
                  view === 'schedule'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Schedule
              </button>
              <button
                onClick={() => setView('properties')}
                className={`px-4 py-2 rounded-md font-medium text-sm transition ${
                  view === 'properties'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Properties
              </button>
              <button
                onClick={() => setView('availability')}
                className={`px-4 py-2 rounded-md font-medium text-sm transition ${
                  view === 'availability'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Availability
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'requests' && <ViewingRequestsScreen onToast={showToast} />}
        {view === 'schedule' && <ScheduleScreen />}
        {view === 'properties' && <PropertiesTab onToast={showToast} />}
        {view === 'availability' && <AvailabilityTab onToast={showToast} />}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
