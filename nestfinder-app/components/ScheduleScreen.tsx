'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface Viewing {
  id: number;
  property_title: string;
  property_postcode: string;
  requested_time: string;
  confirmed_time?: string;
  status: string;
  created_at?: string;
  tenant_name?: string;
}

interface Property {
  id: number;
  postcode: string;
  title: string;
}

interface AvailabilityRule {
  day_of_week: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
}

interface Blockout {
  id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  full_day: boolean;
}

export default function ScheduleScreen() {
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRule[]>([]);
  const [blockouts, setBlockouts] = useState<Blockout[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [viewingsRes, propertiesRes, availabilityRes, blockoutsRes] = await Promise.all([
        axios.get(`${API_URL}/api/viewings`),
        axios.get(`${API_URL}/api/properties`),
        axios.get(`${API_URL}/api/availability`),
        axios.get(`${API_URL}/api/blockouts`),
      ]);
      
      // Filter only confirmed viewings
      const confirmed = viewingsRes.data.filter((v: Viewing) => v.status === 'confirmed');
      setViewings(confirmed);
      setProperties(propertiesRes.data);
      setAvailability(availabilityRes.data || []);
      setBlockouts(blockoutsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get today's confirmed viewings sorted by time
  const getTodayViewings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return viewings
      .filter((viewing) => {
        // For MVP, assume confirmed viewings are for today
        return viewing.status === 'confirmed';
      })
      .sort((a, b) => {
        const timeA = a.confirmed_time || a.requested_time;
        const timeB = b.confirmed_time || b.requested_time;
        return timeA.localeCompare(timeB);
      });
  };

  // Calculate travel time between two postcodes (simplified)
  const getTravelTime = (fromPostcode: string, toPostcode: string): number => {
    if (fromPostcode === toPostcode) return 0;
    // Simplified calculation - in production would use real routing API
    return 15; // Default 15 minutes
  };

  // Calculate average travel time for today's viewings
  const getAverageTravelTime = (): number => {
    const todayViewings = getTodayViewings();
    if (todayViewings.length < 2) return 0;
    
    let totalTravel = 0;
    for (let i = 1; i < todayViewings.length; i++) {
      const prev = todayViewings[i - 1];
      const curr = todayViewings[i];
      totalTravel += getTravelTime(prev.property_postcode, curr.property_postcode);
    }
    
    return Math.round(totalTravel / (todayViewings.length - 1));
  };

  // Get route preview (postcodes in order)
  const getRoutePreview = (): string => {
    const todayViewings = getTodayViewings();
    if (todayViewings.length === 0) return 'No viewings scheduled';
    
    const postcodes = todayViewings.map(v => v.property_postcode);
    return postcodes.join(' → ');
  };

  // Get today's availability rule
  const getTodayAvailability = (): AvailabilityRule | null => {
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convert to 0=Monday, 6=Sunday
    return availability.find(r => r.day_of_week === dayOfWeek) || null;
  };

  // Check if a time slot is within availability window
  const isTimeInAvailability = (timeSlot: string, rule: AvailabilityRule | null): boolean => {
    if (!rule || !rule.enabled) return false;
    
    const [slotHour, slotMin] = timeSlot.split(':').map(Number);
    const slotMinutes = slotHour * 60 + slotMin;
    
    const [startHour, startMin] = rule.start_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    
    const [endHour, endMin] = rule.end_time.split(':').map(Number);
    const endMinutes = endHour * 60 + endMin;
    
    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
  };

  // Check if a time slot is within a blockout
  const isTimeInBlockout = (timeSlot: string): boolean => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const todayBlockouts = blockouts.filter(b => b.date === todayStr);
    
    for (const blockout of todayBlockouts) {
      if (blockout.full_day) return true;
      
      if (blockout.start_time && blockout.end_time) {
        const [slotHour, slotMin] = timeSlot.split(':').map(Number);
        const slotMinutes = slotHour * 60 + slotMin;
        
        const [startHour, startMin] = blockout.start_time.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        
        const [endHour, endMin] = blockout.end_time.split(':').map(Number);
        const endMinutes = endHour * 60 + endMin;
        
        // Check if slot overlaps with blockout (slot is 30 min)
        if (slotMinutes >= startMinutes && slotMinutes < endMinutes) return true;
        if (slotMinutes + 30 > startMinutes && slotMinutes < endMinutes) return true;
      }
    }
    
    return false;
  };

  // Generate timeline slots (09:00 - 18:00, 30-minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
      slots.push(`${String(hour).padStart(2, '0')}:30`);
    }
    return slots;
  };

  // Find viewing for a specific time slot
  const getViewingForSlot = (timeSlot: string) => {
    const todayViewings = getTodayViewings();
    return todayViewings.find(v => {
      const viewingTime = v.confirmed_time || v.requested_time;
      return viewingTime === timeSlot;
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-500">Loading schedule...</div>
    );
  }

  const todayViewings = getTodayViewings();
  const timeSlots = generateTimeSlots();
  const avgTravelTime = getAverageTravelTime();
  const routePreview = getRoutePreview();
  const todayAvailability = getTodayAvailability();

  // Check if today is a day off
  const isDayOff = !todayAvailability || !todayAvailability.enabled;

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Schedule</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Viewings Today</p>
              <p className="text-3xl font-bold text-slate-900">{todayViewings.length}</p>
              <p className="text-xs text-slate-500 mt-2 font-mono">{routePreview}</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Avg Travel Time</p>
              <p className="text-3xl font-bold text-slate-900">
                {avgTravelTime > 0 ? `${avgTravelTime} min` : '--'}
              </p>
            </div>
            <div className="text-4xl">⏱️</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Today's Availability</p>
              <p className="text-lg font-bold text-slate-900">
                {isDayOff ? (
                  <span className="text-red-600">Day Off</span>
                ) : todayAvailability ? (
                  `${todayAvailability.start_time} - ${todayAvailability.end_time}`
                ) : (
                  '--'
                )}
              </p>
            </div>
            <div className="text-4xl">{isDayOff ? '🚫' : '✅'}</div>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      {isDayOff ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-200">
          <div className="text-6xl mb-4">🚫</div>
          <p className="text-lg font-semibold text-slate-700 mb-2">No availability (day off)</p>
          <p className="text-slate-500">Today is marked as unavailable in your schedule</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Today's Schedule
            {todayAvailability && (
              <span className="text-sm font-normal text-slate-500 ml-2">
                ({todayAvailability.start_time} - {todayAvailability.end_time})
              </span>
            )}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {timeSlots.map((slot) => {
              const viewing = getViewingForSlot(slot);
              const isEmpty = !viewing;
              const isAvailable = isTimeInAvailability(slot, todayAvailability);
              const isOutsideWindow = !isAvailable;
              const isBlocked = isTimeInBlockout(slot);
              
              return (
                <div
                  key={slot}
                  className={`rounded-lg p-3 border-2 transition ${
                    viewing
                      ? 'border-green-200 bg-green-50'
                      : isBlocked
                      ? 'border-slate-300 bg-slate-200'
                      : isOutsideWindow
                      ? 'border-slate-100 bg-slate-50 opacity-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className={`text-sm font-semibold mb-1 ${
                    isOutsideWindow || isBlocked ? 'text-slate-400' : 'text-slate-900'
                  }`}>
                    {slot}
                  </div>
                  {viewing ? (
                    <div className="text-xs">
                      <div className="text-green-700 font-medium mb-1">🟩 Confirmed</div>
                      <div className="text-slate-700 truncate" title={viewing.property_title}>
                        {viewing.property_postcode}
                      </div>
                      {viewing.tenant_name && (
                        <div className="text-slate-600 truncate" title={viewing.tenant_name}>
                          {viewing.tenant_name}
                        </div>
                      )}
                    </div>
                  ) : isBlocked ? (
                    <div className="text-xs text-slate-500 font-medium">🚫 Blocked</div>
                  ) : isOutsideWindow ? (
                    <div className="text-xs text-slate-400 italic">Outside hours</div>
                  ) : (
                    <div className="text-xs text-slate-400">Available</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
