'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

interface Property {
  id: number;
  title: string;
  area: string;
  address: string;
  postcode: string;
  rent: number | null;
  public_link: string | null;
  slug: string;
}

interface Agency {
  id: number;
  name: string;
  slug: string;
}

export default function MasterAgentLinkPage() {
  const params = useParams();
  const router = useRouter();
  const agentSlug = params.agentSlug as string;
  
  const [agency, setAgency] = useState<Agency | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    loadAgencyAndProperties();
  }, [agentSlug]);

  const loadAgencyAndProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load agency
      const agencyResponse = await axios.get(`${API_URL}/api/agencies/${agentSlug}`);
      setAgency(agencyResponse.data);
      
      // Load properties
      const propertiesResponse = await axios.get(`${API_URL}/api/agencies/${agentSlug}/properties`);
      setProperties(propertiesResponse.data);
      
      if (propertiesResponse.data.length === 0) {
        setError('No properties available at this time.');
      }
    } catch (err: any) {
      console.error('Failed to load agency/properties:', err);
      if (err.response?.status === 404) {
        setError('Agency not found.');
      } else {
        setError('Failed to load properties. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySelect = (propertyId: string) => {
    const property = properties.find(p => p.id.toString() === propertyId);
    if (property) {
      setSelectedProperty(property);
    }
  };

  const handleContinue = () => {
    if (selectedProperty) {
      // Navigate to scheduling flow using property slug
      router.push(`/tenant/${selectedProperty.slug}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Error</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Step 1: Property Selection */}
        {!selectedProperty && (
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Book a Viewing
            </h1>
            <p className="text-slate-600 mb-6">
              Which property do you want to view?
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Property *
              </label>
              <select
                value={selectedProperty?.id.toString() || ''}
                onChange={(e) => handlePropertySelect(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900"
                required
              >
                <option value="">-- Select a property --</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id.toString()}>
                    {property.title} – ({property.area}) – £{property.rent || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Confirmation Box */}
        {selectedProperty && (
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Confirm Property Selection
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Selected Property
                </label>
                <p className="text-slate-900 font-medium text-lg">
                  {selectedProperty.title}
                </p>
              </div>

              <div className="text-sm text-slate-600">
                <p><strong>Area:</strong> {selectedProperty.area}</p>
                <p><strong>Address:</strong> {selectedProperty.address}</p>
                <p><strong>Postcode:</strong> {selectedProperty.postcode}</p>
                {selectedProperty.rent && (
                  <p><strong>Rent:</strong> £{selectedProperty.rent}</p>
                )}
              </div>

              {selectedProperty.public_link && (
                <div className="pt-2">
                  <a
                    href={selectedProperty.public_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium underline"
                  >
                    View original listing →
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedProperty(null)}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition"
              >
                Continue to Scheduling
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

