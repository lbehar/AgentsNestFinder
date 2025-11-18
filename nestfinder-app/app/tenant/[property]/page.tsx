'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';

interface Property {
  id: number;
  title: string;
  address: string;
  postcode: string;
  rent: number | null;
  slug: string;
}

export default function TenantBookingPage() {
  const params = useParams();
  const propertySlug = params.property as string;
  
  const [property, setProperty] = useState<Property | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Array<{time: string, status?: string, travel_minutes?: number}>>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    moveInDate: '',
    occupants: '',
    rentBudget: '',
    message: '',
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Get today's date in YYYY-MM-DD format for min date
  const minDate = (() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  // Initialize selectedDate to today
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  }, []);

  useEffect(() => {
    loadProperty();
  }, [propertySlug]);

  useEffect(() => {
    // Reload slots when date changes
    if (property && selectedDate) {
      loadAvailableSlots(property.id, selectedDate);
    }
  }, [selectedDate, property]);

  const loadProperty = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/properties/${propertySlug}`);
      setProperty(response.data);
    } catch (error) {
      console.error('Failed to load property:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async (propertyId: number, date: string) => {
    setLoadingSlots(true);
    try {
      const slotsResponse = await axios.get(`${API_URL}/api/properties/${propertyId}/available-slots`, {
        params: { date }
      });
      console.log('Available slots response:', slotsResponse.data);
      setAvailableSlots(slotsResponse.data.slots || []);
      setSelectedSlot(''); // Reset selected slot when date changes
    } catch (slotsError: any) {
      console.error('Failed to load available slots:', slotsError);
      console.error('Error details:', slotsError.response?.data);
      setAvailableSlots([]);
      setSelectedSlot('');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSlot || !property) {
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(`${API_URL}/api/viewings`, {
        tenant_name: formData.name,
        tenant_email: formData.email,
        tenant_phone: formData.phone,
        property_id: property.id,
        requested_time: selectedSlot,
        move_in_date: formData.moveInDate || null,
        occupants: formData.occupants ? parseInt(formData.occupants) : null,
        rent_budget: formData.rentBudget ? parseFloat(formData.rentBudget) : null,
        message: formData.message || null,
      });

      setSubmitted(true);
    } catch (error: any) {
      console.error('Failed to submit viewing request:', error);
      alert(error.response?.data?.detail || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Property not found</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Sent!</h2>
          <p className="text-slate-600 mb-6">
            Your viewing request has been submitted. The agent will confirm shortly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Property Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{property.title}</h1>
          <p className="text-slate-600 mb-2">{property.address}</p>
          <p className="text-slate-500 text-sm mb-4">{property.postcode}</p>
          {property.rent && (
            <p className="text-lg font-semibold text-slate-900">£{property.rent.toLocaleString()}/month</p>
          )}
        </div>

        {/* Booking Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Book a Viewing</h2>
          <p className="text-slate-600 mb-6">Select your preferred time slot</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Viewing Date *
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={minDate}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Time Slot Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Available Times *
              </label>
              {loadingSlots ? (
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <p className="text-slate-500 text-sm">Loading available slots...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800 text-sm font-medium mb-1">
                    No available slots at this time
                  </p>
                  <p className="text-amber-700 text-xs">
                    This could be because today is outside your availability window, or all slots are already booked. 
                    Please check back tomorrow or contact the agent directly.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setSelectedSlot(slot.time)}
                      className={`px-4 py-3 rounded-lg font-medium transition ${
                        selectedSlot === slot.time
                          ? 'bg-primary-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {slot.time}
                      {slot.status === 'tight' && slot.travel_minutes && (
                        <span className="block text-xs opacity-75 mt-1">
                          {slot.travel_minutes} min travel
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tenant Information */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="+44 7700 900000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Preferred Move-In Date
                  </label>
                  <input
                    type="date"
                    value={formData.moveInDate}
                    onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                    min={minDate}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Number of Occupants
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.occupants}
                    onChange={(e) => setFormData({ ...formData, occupants: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rent Budget (£/month)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.rentBudget}
                    onChange={(e) => setFormData({ ...formData, rentBudget: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="1800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Any additional information..."
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedSlot || submitting}
              className="w-full bg-primary-500 text-white py-3 rounded-xl font-semibold hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Request Viewing'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

