'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface Property {
  id: number;
  title: string;
  area?: string;
  address: string;
  postcode: string;
  rent: number | null;
  status: string;
  source: string | null;
  slug?: string;
  public_link?: string | null;
}

interface PropertiesTabProps {
  onToast: (message: string, type?: 'success' | 'error') => void;
}

export default function PropertiesTab({ onToast }: PropertiesTabProps) {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [agency, setAgency] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    loadProperties();
    loadAgency();
  }, []);

  const loadAgency = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/agency`);
      setAgency(response.data);
    } catch (error) {
      console.error('Failed to load agency:', error);
    }
  };

  const loadProperties = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/properties`);
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to load properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = () => {
    router.push('/add-property');
  };

  const handleSyncEmail = () => {
    const email = 'listings@nestfinder.uk';
    const subject = 'Add Property';
    const body = `Property Title:\nAddress:\nPostcode:\nRent:`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getBookingLink = () => {
    if (!agency?.slug) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'nestfinder.uk';
    return `${baseUrl}/a/${agency.slug}`;
  };

  const copyBookingLink = () => {
    const link = getBookingLink();
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedId(-1); // Use -1 for master link
      onToast('Master booking link copied to clipboard ✅');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleEditProperty = (propertyId: number) => {
    router.push(`/edit-property/${propertyId}`);
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading properties...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Properties</h2>
        <div className="flex gap-3">
          <button
            onClick={handleSyncEmail}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
          >
            📧 Sync from Email
          </button>
          <button
            onClick={handleAddProperty}
            className="px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition"
          >
            + Add Property
          </button>
        </div>
      </div>

      {/* Master Booking Link */}
      {agency?.slug && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Master Booking Link
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Share this single link with all tenants. They'll select a property from a dropdown.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={getBookingLink()}
                  readOnly
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50 font-mono flex-1 max-w-md"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={copyBookingLink}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition text-sm font-medium"
                >
                  {copiedId === -1 ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No properties yet. Add your first property to get started.
                  </td>
                </tr>
              ) : (
                properties.map((property) => (
                  <tr key={property.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {property.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">{property.address}</div>
                      <div className="text-sm text-slate-500">{property.postcode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          property.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {property.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {property.source || 'Manual'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleEditProperty(property.id)}
                        className="px-3 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

