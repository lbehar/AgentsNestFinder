import { useState, useEffect } from 'react';
import { loadProperties, loadViewings, watchStorage } from './utils/storage';
import DashboardTab from './components/DashboardTab';
import PropertiesTab from './components/PropertiesTab';
import ViewingsTab from './components/ViewingsTab';
import ShareLinkTab from './components/ShareLinkTab';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [properties, setProperties] = useState([]);
  const [viewings, setViewings] = useState([]);

  // Load data on mount
  useEffect(() => {
    setProperties(loadProperties());
    setViewings(loadViewings());
  }, []);

  // Watch for localStorage changes (new tenant bookings) - storage events only, no polling
  useEffect(() => {
    const handleStorageChange = () => {
      // Reload viewings when localStorage changes (with slight delay to avoid race conditions)
      setTimeout(() => {
        setViewings(loadViewings());
        setProperties(loadProperties()); // Also reload properties in case they changed
      }, 100);
    };

    // Listen for storage events (both native cross-tab events and custom same-tab events)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'properties', label: 'Properties', icon: '🏘️' },
    { id: 'viewings', label: 'Viewings', icon: '📅' },
    { id: 'share', label: 'Share Link', icon: '🔗' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-slate-900">🏠 NestFinder Agent Dashboard</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium text-sm whitespace-nowrap border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardTab properties={properties} viewings={viewings} />
        )}
        {activeTab === 'properties' && (
          <PropertiesTab
            properties={properties}
            onUpdate={setProperties}
          />
        )}
        {activeTab === 'viewings' && (
          <ViewingsTab
            viewings={viewings}
            onUpdate={setViewings}
          />
        )}
        {activeTab === 'share' && <ShareLinkTab />}
      </main>
    </div>
  );
}

export default App;

