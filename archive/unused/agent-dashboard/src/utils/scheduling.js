// Core scheduling functions extracted from scheduler.js
// Works with localStorage data (properties and viewings)

// Constants
export const VIEWING_DURATION = 20; // minutes
export const TRAVEL_BUFFER = 10; // minutes

// Postcode coordinates for London areas
export const postcodeCoords = {
    "W2 4DX": [51.515, -0.183],   // Paddington
    "W11 2BQ": [51.515, -0.196],  // Notting Hill
    "W1D 4HT": [51.515, -0.131],  // Soho
    "N1 9GU": [51.536, -0.106],   // Islington
    "W1K 6TF": [51.509, -0.150],  // Mayfair
    "NW1 7AB": [51.539, -0.142],  // Camden
    "E1 6AN": [51.524, -0.081],   // Shoreditch
    "SW4 0LG": [51.465, -0.138],  // Clapham
    "SE10 9RT": [51.483, 0.008],  // Greenwich
    "E14 5AB": [51.505, -0.020]   // Canary Wharf
};

// ============================================
// TIME UTILITIES
// ============================================

export function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

export function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function addMinutes(time, minutes) {
    return time + minutes;
}

export function getTimeSlots() {
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
        slots.push(formatTime(hour * 60));
        slots.push(formatTime(hour * 60 + 30));
    }
    return slots;
}

// ============================================
// TRAVEL TIME CALCULATION
// ============================================

export function getBaseTravelTime(fromPostcode, toPostcode) {
    if (fromPostcode === toPostcode) return 0;
    
    const from = postcodeCoords[fromPostcode];
    const to = postcodeCoords[toPostcode];
    
    if (!from || !to) return 30;
    
    // Haversine formula
    const R = 6371;
    const dLat = (to[0] - from[0]) * Math.PI / 180;
    const dLon = (to[1] - from[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(from[0] * Math.PI / 180) * Math.cos(to[0] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    const travelTime = (distance / 30) * 60 + 5;
    return Math.ceil(travelTime / 5) * 5;
}

export function getRandomizedTravelTime(fromPostcode, toPostcode) {
    const base = getBaseTravelTime(fromPostcode, toPostcode);
    // Add random variation ±10 minutes
    const variation = Math.floor(Math.random() * 21) - 10; // -10 to +10
    return Math.max(5, base + variation); // Minimum 5 minutes
}

// ============================================
// FEASIBILITY CHECKING
// ============================================

/**
 * Check if a time slot is feasible for an agent
 * @param {number} agentId - Agent ID
 * @param {string} time - Time string (HH:MM)
 * @param {number} propertyId - Property ID
 * @param {Array} properties - Array of property objects
 * @param {Array} viewings - Array of viewing objects
 * @returns {Object} { feasible: boolean, reason?: string }
 */
export function checkAgentSlotFeasibility(agentId, time, propertyId, properties, viewings) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return { feasible: false, reason: "Property not found" };
    
    const timeMinutes = parseTime(time);
    const viewingEnd = addMinutes(timeMinutes, VIEWING_DURATION);
    
    // Check agent's confirmed viewings for conflicts
    const agentViewings = viewings.filter(v => 
        v.agentId === agentId && v.status === 'confirmed'
    ).sort((a, b) => {
        const timeA = a.confirmedTime || a.time;
        const timeB = b.confirmedTime || b.time;
        return timeA.localeCompare(timeB);
    });
    
    // Check for direct time overlap
    for (const viewing of agentViewings) {
        const viewingTime = viewing.confirmedTime || viewing.time;
        const viewingStart = parseTime(viewingTime);
        const viewingEndTime = addMinutes(viewingStart, VIEWING_DURATION);
        
        // Check for overlap
        if ((timeMinutes >= viewingStart && timeMinutes < viewingEndTime) ||
            (viewingStart >= timeMinutes && viewingStart < viewingEnd)) {
            return { feasible: false, reason: "Agent has viewing at this time" };
        }
    }
    
    // Find previous and next viewings
    const prevViewing = agentViewings
        .filter(v => {
            const viewingTime = v.confirmedTime || v.time;
            return parseTime(viewingTime) < timeMinutes;
        })
        .pop();
    
    const nextViewing = agentViewings.find(v => {
        const viewingTime = v.confirmedTime || v.time;
        return parseTime(viewingTime) > timeMinutes;
    });
    
    // Check travel time from previous viewing
    if (prevViewing) {
        const prevProperty = properties.find(p => p.id === prevViewing.propertyId);
        if (prevProperty) {
            const travelTime = getRandomizedTravelTime(prevProperty.postcode, property.postcode);
            const prevViewingTime = prevViewing.confirmedTime || prevViewing.time;
            const prevViewingEnd = addMinutes(parseTime(prevViewingTime), VIEWING_DURATION);
            const minNextTime = addMinutes(prevViewingEnd, TRAVEL_BUFFER + travelTime);
            
            if (timeMinutes < minNextTime) {
                return { feasible: false, reason: `Insufficient travel time from ${prevProperty.postcode}` };
            }
        }
    }
    
    // Check travel time to next viewing
    if (nextViewing) {
        const nextProperty = properties.find(p => p.id === nextViewing.propertyId);
        if (nextProperty) {
            const travelToNext = getRandomizedTravelTime(property.postcode, nextProperty.postcode);
            const thisViewingEnd = addMinutes(timeMinutes, VIEWING_DURATION);
            const minNextStart = addMinutes(thisViewingEnd, TRAVEL_BUFFER + travelToNext);
            const nextViewingTime = nextViewing.confirmedTime || nextViewing.time;
            const nextStart = parseTime(nextViewingTime);
            
            if (minNextStart > nextStart) {
                return { feasible: false, reason: `Insufficient time before next viewing` };
            }
        }
    }
    
    return { feasible: true };
}

/**
 * Get available time slots for a property (filtered by feasibility)
 * @param {number} propertyId - Property ID
 * @param {Array} properties - Array of property objects
 * @param {Array} viewings - Array of viewing objects
 * @returns {Array} Array of available time slot strings (HH:MM)
 */
export function getAvailableTimeSlots(propertyId, properties, viewings) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return [];
    
    const agentId = property.agentId;
    const allSlots = getTimeSlots();
    const availableSlots = [];
    
    allSlots.forEach(slot => {
        const feasibility = checkAgentSlotFeasibility(agentId, slot, propertyId, properties, viewings);
        if (feasibility.feasible) {
            availableSlots.push(slot);
        }
    });
    
    return availableSlots;
}

