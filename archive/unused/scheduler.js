// ============================================
// DATA MODEL
// ============================================

// Properties with agent assignments
const properties = [
    { id: 1, name: "Modern Flat in Paddington", postcode: "W2 4DX", bedrooms: 2, price: 1800, agentId: 1 },
    { id: 2, name: "Victorian House in Notting Hill", postcode: "W11 2BQ", bedrooms: 3, price: 3200, agentId: 1 },
    { id: 3, name: "Studio Apartment in Soho", postcode: "W1D 4HT", bedrooms: 1, price: 1500, agentId: 1 },
    { id: 4, name: "Family Home in Islington", postcode: "N1 9GU", bedrooms: 4, price: 2800, agentId: 2 },
    { id: 5, name: "Luxury Flat in Mayfair", postcode: "W1K 6TF", bedrooms: 2, price: 4500, agentId: 2 },
    { id: 6, name: "Townhouse in Camden", postcode: "NW1 7AB", bedrooms: 3, price: 2400, agentId: 2 },
    { id: 7, name: "Apartment in Shoreditch", postcode: "E1 6AN", bedrooms: 2, price: 2200, agentId: 3 },
    { id: 8, name: "House in Clapham", postcode: "SW4 0LG", bedrooms: 3, price: 2600, agentId: 3 },
    { id: 9, name: "Flat in Greenwich", postcode: "SE10 9RT", bedrooms: 2, price: 1900, agentId: 3 },
    { id: 10, name: "Penthouse in Canary Wharf", postcode: "E14 5AB", bedrooms: 3, price: 3800, agentId: 3 }
];

// Tenants
const tenants = [
    { id: 1, name: "Sarah" },
    { id: 2, name: "James" },
    { id: 3, name: "Emma" }
];

// Agents
const agents = [
    { id: 1, name: "Agent Alex" },
    { id: 2, name: "Agent Maria" },
    { id: 3, name: "Agent David" }
];

// Postcode coordinates
const postcodeCoords = {
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

// Viewings storage
let viewings = [];
let viewingIdCounter = 1;

// State
let currentTenantId = 1;
let currentAgentId = 1;
let travelTolerance = 15; // minutes
const VIEWING_DURATION = 20; // minutes
const TRAVEL_BUFFER = 10; // minutes
const PENDING_NOTIFICATION_DELAY = 2; // minutes (simulated)

// ============================================
// TRAVEL TIME CALCULATION
// ============================================

function getBaseTravelTime(fromPostcode, toPostcode) {
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

function getRandomizedTravelTime(fromPostcode, toPostcode) {
    const base = getBaseTravelTime(fromPostcode, toPostcode);
    // Add random variation ±10 minutes
    const variation = Math.floor(Math.random() * 21) - 10; // -10 to +10
    return Math.max(5, base + variation); // Minimum 5 minutes
}

// ============================================
// TIME UTILITIES
// ============================================

function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function addMinutes(time, minutes) {
    return time + minutes;
}

function getTimeSlots() {
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
        slots.push(formatTime(hour * 60));
        slots.push(formatTime(hour * 60 + 30));
    }
    return slots;
}

// ============================================
// GEOGRAPHIC CLUSTERING
// ============================================

function getPostcodeCluster(postcode) {
    const prefix = postcode.split(' ')[0];
    if (prefix.startsWith('W') || prefix.startsWith('SW')) {
        return 'West London';
    } else if (prefix.startsWith('E') || prefix.startsWith('EC')) {
        return 'East London';
    } else if (prefix.startsWith('N') || prefix.startsWith('NW')) {
        return 'North London';
    } else if (prefix.startsWith('SE') || prefix.startsWith('S')) {
        return 'South London';
    }
    return 'Central London';
}

function getClusterProperties(clusterName) {
    return properties.filter(p => getPostcodeCluster(p.postcode) === clusterName);
}

function getClosestCluster(fromPostcode, availableClusters) {
    let closestCluster = null;
    let minDistance = Infinity;
    
    const from = postcodeCoords[fromPostcode];
    if (!from) return null;
    
    availableClusters.forEach(clusterName => {
        const clusterProps = getClusterProperties(clusterName);
        if (clusterProps.length === 0) return;
        
        // Find average center of cluster
        let avgLat = 0, avgLon = 0;
        clusterProps.forEach(prop => {
            const coords = postcodeCoords[prop.postcode];
            if (coords) {
                avgLat += coords[0];
                avgLon += coords[1];
            }
        });
        avgLat /= clusterProps.length;
        avgLon /= clusterProps.length;
        
        // Calculate distance
        const R = 6371;
        const dLat = (avgLat - from[0]) * Math.PI / 180;
        const dLon = (avgLon - from[1]) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(from[0] * Math.PI / 180) * Math.cos(avgLat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        if (distance < minDistance) {
            minDistance = distance;
            closestCluster = clusterName;
        }
    });
    
    return closestCluster;
}

// ============================================
// CONFLICT CHECKING
// ============================================

function checkViewingFeasibility(tenantId, propertyId, requestedTime) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return { feasible: false, reason: "Property not found" };

    const agentId = property.agentId;
    const requestedMinutes = parseTime(requestedTime);
    const viewingEnd = addMinutes(requestedMinutes, VIEWING_DURATION);

    // Check tenant conflicts (double-booking same time)
    const tenantViewings = viewings.filter(v => 
        v.tenantId === tenantId && v.status === 'confirmed'
    );
    
    for (const viewing of tenantViewings) {
        const viewingStart = parseTime(viewing.confirmedTime || viewing.requestedTime);
        const viewingEndTime = addMinutes(viewingStart, VIEWING_DURATION);
        
        // Check for overlap
        if ((requestedMinutes >= viewingStart && requestedMinutes < viewingEndTime) ||
            (viewingStart >= requestedMinutes && viewingStart < viewingEnd)) {
            const conflictPostcode = properties.find(p => p.id === viewing.propertyId)?.postcode;
            const nextAvailable = formatTime(addMinutes(viewingEndTime, TRAVEL_BUFFER));
            return {
                feasible: false,
                reason: `You already have a ${viewing.confirmedTime || viewing.requestedTime} viewing in ${conflictPostcode} — next available is ${nextAvailable}`,
                suggestedTime: nextAvailable,
                conflictType: 'tenant'
            };
        }
    }

    // Check travel time from previous viewing
    const lastViewing = tenantViewings
        .filter(v => v.confirmedTime)
        .sort((a, b) => a.confirmedTime.localeCompare(b.confirmedTime))
        .pop();
    
    if (lastViewing) {
        const lastProperty = properties.find(p => p.id === lastViewing.propertyId);
        const travelTime = getRandomizedTravelTime(lastProperty.postcode, property.postcode);
        const lastViewingEnd = addMinutes(parseTime(lastViewing.confirmedTime), VIEWING_DURATION);
        const minNextTime = addMinutes(lastViewingEnd, TRAVEL_BUFFER + travelTime);
        
        if (requestedMinutes < minNextTime) {
            const suggestedTime = formatTime(minNextTime);
            return {
                feasible: false,
                reason: `Travel time from ${lastProperty.postcode} is ${travelTime} min. Next available: ${suggestedTime}`,
                suggestedTime: suggestedTime,
                conflictType: 'travel'
            };
        }
        
        if (travelTime > travelTolerance) {
            return {
                feasible: false,
                reason: `Travel time (${travelTime} min) exceeds tolerance (${travelTolerance} min)`,
                suggestedTime: null,
                conflictType: 'travel'
            };
        }
    }

    // Check agent conflicts
    const agentViewings = viewings.filter(v => 
        v.agentId === agentId && v.status === 'confirmed'
    );
    
    for (const viewing of agentViewings) {
        const viewingStart = parseTime(viewing.confirmedTime);
        const viewingEndTime = addMinutes(viewingStart, VIEWING_DURATION);
        
        if ((requestedMinutes >= viewingStart && requestedMinutes < viewingEndTime) ||
            (viewingStart >= requestedMinutes && viewingStart < viewingEnd)) {
            return {
                feasible: false,
                reason: "Agent already has a viewing at this time",
                conflictType: 'agent'
            };
        }
    }

    return { feasible: true, reason: null };
}

// ============================================
// VIEWING MANAGEMENT
// ============================================

function findOptimalSlot(agentId, propertyId, requestedTime, sameClusterOnly = false) {
    const property = properties.find(p => p.id === propertyId);
    const agentViewings = viewings.filter(v => 
        v.agentId === agentId && v.status === 'confirmed'
    ).sort((a, b) => a.confirmedTime.localeCompare(b.confirmedTime));
    
    const requestedMinutes = parseTime(requestedTime);
    const targetCluster = getPostcodeCluster(property.postcode);
    
    // Check if requested time is feasible
    const feasibility = checkAgentSlotFeasibility(agentId, requestedTime, propertyId);
    if (feasibility.feasible) {
        return { time: requestedTime, adjusted: false, cluster: targetCluster };
    }
    
    if (!autoRescheduleEnabled) {
        return null;
    }
    
    // Step 1: Same-cluster adjustment (search within 90 minutes)
    const slots = getTimeSlots();
    const startIndex = slots.findIndex(s => parseTime(s) >= requestedMinutes);
    const endIndex = Math.min(startIndex + 6, slots.length); // 90 minutes = 6 slots
    
    for (let i = startIndex; i < endIndex; i++) {
        const testTime = slots[i];
        const testFeasibility = checkAgentSlotFeasibility(agentId, testTime, propertyId);
        
        if (testFeasibility.feasible) {
            return { time: testTime, adjusted: true, cluster: targetCluster, reason: 'same-cluster' };
        }
    }
    
    if (sameClusterOnly) {
        return null;
    }
    
    // Step 2: Cross-cluster optimization
    const allClusters = ['West London', 'East London', 'North London', 'South London', 'Central London'];
    const otherClusters = allClusters.filter(c => c !== targetCluster);
    
    // Find closest cluster
    let lastAgentViewing = agentViewings[agentViewings.length - 1];
    let fromPostcode = property.postcode;
    if (lastAgentViewing) {
        const lastProp = properties.find(p => p.id === lastAgentViewing.propertyId);
        fromPostcode = lastProp.postcode;
    }
    
    const closestCluster = getClosestCluster(fromPostcode, otherClusters);
    if (closestCluster) {
        // Search in closest cluster (extend search to end of day)
        for (let i = startIndex; i < slots.length; i++) {
            const testTime = slots[i];
            const testFeasibility = checkAgentSlotFeasibility(agentId, testTime, propertyId);
            
            if (testFeasibility.feasible) {
                clusterSwitchCount++;
                return { time: testTime, adjusted: true, cluster: closestCluster, reason: 'cross-cluster' };
            }
        }
    }
    
    // No slot found today
    return null;
}

function checkAgentSlotFeasibility(agentId, time, propertyId) {
    const property = properties.find(p => p.id === propertyId);
    const timeMinutes = parseTime(time);
    const viewingEnd = addMinutes(timeMinutes, VIEWING_DURATION);
    
    // Check agent's confirmed viewings for conflicts
    const agentViewings = viewings.filter(v => 
        v.agentId === agentId && v.status === 'confirmed'
    ).sort((a, b) => a.confirmedTime.localeCompare(b.confirmedTime));
    
    // Check for direct time overlap
    for (const viewing of agentViewings) {
        const viewingStart = parseTime(viewing.confirmedTime);
        const viewingEndTime = addMinutes(viewingStart, VIEWING_DURATION);
        
        // Check for overlap
        if ((timeMinutes >= viewingStart && timeMinutes < viewingEndTime) ||
            (viewingStart >= timeMinutes && viewingStart < viewingEnd)) {
            return { feasible: false, reason: "Agent has viewing at this time" };
        }
    }
    
    // Find previous and next viewings
    const prevViewing = agentViewings
        .filter(v => parseTime(v.confirmedTime) < timeMinutes)
        .pop();
    
    const nextViewing = agentViewings.find(v => parseTime(v.confirmedTime) > timeMinutes);
    
    // Check travel time from previous viewing
    if (prevViewing) {
        const prevProperty = properties.find(p => p.id === prevViewing.propertyId);
        const travelTime = getRandomizedTravelTime(prevProperty.postcode, property.postcode);
        const prevViewingEnd = addMinutes(parseTime(prevViewing.confirmedTime), VIEWING_DURATION);
        const minNextTime = addMinutes(prevViewingEnd, TRAVEL_BUFFER + travelTime);
        
        if (timeMinutes < minNextTime) {
            return { feasible: false, reason: `Insufficient travel time from ${prevProperty.postcode}` };
        }
    }
    
    // Check travel time to next viewing
    if (nextViewing) {
        const nextProperty = properties.find(p => p.id === nextViewing.propertyId);
        const travelToNext = getRandomizedTravelTime(property.postcode, nextProperty.postcode);
        const thisViewingEnd = addMinutes(timeMinutes, VIEWING_DURATION);
        const minNextStart = addMinutes(thisViewingEnd, TRAVEL_BUFFER + travelToNext);
        const nextStart = parseTime(nextViewing.confirmedTime);
        
        if (minNextStart > nextStart) {
            return { feasible: false, reason: `Insufficient time before next viewing` };
        }
    }
    
    return { feasible: true };
}

function getFeasibilityStatus(agentId, propertyId, requestedTime) {
    const feasibility = checkAgentSlotFeasibility(agentId, requestedTime, propertyId);
    
    if (!feasibility.feasible) {
        return { status: 'conflict', label: 'Conflict', color: '#f44336' };
    }
    
    // Calculate travel time to determine if it's tight
    const property = properties.find(p => p.id === propertyId);
    const agentViewings = viewings.filter(v => 
        v.agentId === agentId && v.status === 'confirmed'
    ).sort((a, b) => a.confirmedTime.localeCompare(b.confirmedTime));
    
    const requestedMinutes = parseTime(requestedTime);
    const prevViewing = agentViewings
        .filter(v => parseTime(v.confirmedTime) < requestedMinutes)
        .pop();
    
    if (prevViewing) {
        const prevProperty = properties.find(p => p.id === prevViewing.propertyId);
        const travelTime = getRandomizedTravelTime(prevProperty.postcode, property.postcode);
        
        if (travelTime > travelTolerance) {
            return { status: 'tight', label: 'Tight', color: '#ff9800' };
        }
    }
    
    return { status: 'ok', label: 'OK', color: '#4caf50' };
}

function getAvailableTimeSlots(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return [];
    
    const agentId = property.agentId;
    const allSlots = getTimeSlots();
    const availableSlots = [];
    
    allSlots.forEach(slot => {
        const feasibility = checkAgentSlotFeasibility(agentId, slot, propertyId);
        if (feasibility.feasible) {
            availableSlots.push(slot);
        }
    });
    
    return availableSlots;
}

function requestViewing(tenantId, propertyId, requestedTime) {
    const property = properties.find(p => p.id === propertyId);
    const agentId = property.agentId;
    
    // Check feasibility
    const feasibility = checkAgentSlotFeasibility(agentId, requestedTime, propertyId);
    
    if (!feasibility.feasible) {
        addTenantMessage(tenantId, 
            `⚠️ Requested time ${requestedTime} is not available: ${feasibility.reason}`
        );
        return null;
    }
    
    // Calculate travel time
    const agentViewings = viewings.filter(v => 
        v.agentId === agentId && v.status === 'confirmed'
    ).sort((a, b) => a.confirmedTime.localeCompare(b.confirmedTime));
    
    let travelTime = null;
    const requestedMinutes = parseTime(requestedTime);
    const prevViewing = agentViewings
        .filter(v => parseTime(v.confirmedTime) < requestedMinutes)
        .pop();
    
    if (prevViewing) {
        const prevProperty = properties.find(p => p.id === prevViewing.propertyId);
        travelTime = getRandomizedTravelTime(prevProperty.postcode, property.postcode);
    }
    
    // Get feasibility status
    const feasibilityStatus = getFeasibilityStatus(agentId, propertyId, requestedTime);
    
    // Create pending request
    const viewing = {
        id: viewingIdCounter++,
        tenantId,
        agentId,
        propertyId,
        requestedTime,
        status: 'pending',
        travelTime: travelTime,
        confirmedTime: null,
        suggestedTime: null,
        feasibilityStatus: feasibilityStatus.status,
        requestTime: new Date().toISOString()
    };

    viewings.push(viewing);
    
    addTenantMessage(tenantId, 
        `Request sent for ${property.postcode} at ${requestedTime} - Pending confirmation`
    );
    
    // Show notification to agent
    showAgentNotification(agentId, viewing.id);
    
    // Schedule reminder if not actioned
    setTimeout(() => {
        const stillPending = viewings.find(v => v.id === viewing.id && v.status === 'pending');
        if (stillPending) {
            showAgentNotification(agentId, viewing.id, true);
        }
    }, PENDING_NOTIFICATION_DELAY * 60 * 1000);

    updateAllViews();
    return viewing;
}

function confirmViewing(viewingId) {
    const viewing = viewings.find(v => v.id === viewingId);
    if (!viewing) return;

    viewing.status = 'confirmed';
    viewing.confirmedTime = viewing.suggestedTime || viewing.requestedTime;
    
    const property = properties.find(p => p.id === viewing.propertyId);
    const agent = agents.find(a => a.id === viewing.agentId);
    
    addTenantMessage(viewing.tenantId, 
        `${agent.name} confirmed your viewing for ${viewing.confirmedTime} ✅`
    );

    updateAllViews();
}

function suggestAlternativeTime(viewingId) {
    const viewing = viewings.find(v => v.id === viewingId);
    if (!viewing) return;

    const property = properties.find(p => p.id === viewing.propertyId);
    const agent = agents.find(a => a.id === viewing.agentId);
    
    // Find next viable slot
    const slots = getTimeSlots();
    const requestedMinutes = parseTime(viewing.requestedTime);
    const startIndex = slots.findIndex(s => parseTime(s) > requestedMinutes);
    
    let suggestedTime = null;
    for (let i = startIndex; i < slots.length; i++) {
        const testTime = slots[i];
        const feasibility = checkAgentSlotFeasibility(viewing.agentId, testTime, viewing.propertyId);
        
        if (feasibility.feasible) {
            suggestedTime = testTime;
            break;
        }
    }

    if (suggestedTime) {
        viewing.suggestedTime = suggestedTime;
        viewing.status = 'suggested';
        
        addTenantMessage(viewing.tenantId,
            `${agent.name} suggested new time for ${property.postcode}: ${suggestedTime}. Do you accept?`
        );
    } else {
        addTenantMessage(viewing.tenantId,
            `❌ ${agent.name} couldn't find an alternative time for ${property.postcode} today`
        );
    }

    updateAllViews();
}

function declineViewing(viewingId) {
    const viewing = viewings.find(v => v.id === viewingId);
    if (!viewing) return;

    viewing.status = 'declined';
    
    const property = properties.find(p => p.id === viewing.propertyId);
    const agent = agents.find(a => a.id === viewing.agentId);
    
    addTenantMessage(viewing.tenantId,
        `❌ ${agent.name} declined your request for ${property.postcode} at ${viewing.requestedTime}`
    );

    updateAllViews();
}

function acceptSuggestedTime(viewingId) {
    const viewing = viewings.find(v => v.id === viewingId);
    if (!viewing || viewing.status !== 'suggested') return;

    viewing.status = 'confirmed';
    viewing.confirmedTime = viewing.suggestedTime;
    
    const property = properties.find(p => p.id === viewing.propertyId);
    const agent = agents.find(a => a.id === viewing.agentId);
    
    addTenantMessage(viewing.tenantId,
        `✅ You accepted ${agent.name}'s suggestion. Viewing confirmed for ${viewing.confirmedTime} at ${property.postcode}`
    );

    updateAllViews();
}

function declineSuggestedTime(viewingId) {
    const viewing = viewings.find(v => v.id === viewingId);
    if (!viewing || viewing.status !== 'suggested') return;

    viewing.status = 'declined';
    
    const property = properties.find(p => p.id === viewing.propertyId);
    
    addTenantMessage(viewing.tenantId,
        `You declined the suggested time for ${property.postcode}. Request cancelled.`
    );

    updateAllViews();
}

function showAgentNotification(agentId, viewingId, isReminder = false) {
    if (agentId !== currentAgentId) return;
    
    const viewing = viewings.find(v => v.id === viewingId);
    if (!viewing) return;
    
    const property = properties.find(p => p.id === viewing.propertyId);
    const tenant = tenants.find(t => t.id === viewing.tenantId);
    
    const notification = document.getElementById('notification-toast');
    const notificationText = document.getElementById('notification-text');
    
    notificationText.textContent = isReminder 
        ? `⏰ Reminder: ${tenant.name} requested ${property.postcode} at ${viewing.requestedTime}`
        : `🔔 New request: ${tenant.name} - ${property.postcode} at ${viewing.requestedTime}`;
    
    notification.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}


function declineViewing(viewingId) {
    const viewing = viewings.find(v => v.id === viewingId);
    if (!viewing) return;

    viewing.status = 'declined';
    
    const property = properties.find(p => p.id === viewing.propertyId);
    
    addTenantMessage(viewing.tenantId,
        `❌ Request for ${property.postcode} at ${viewing.requestedTime} was declined.`
    );

    updateAllViews();
}

function acceptSuggestedTime(viewingId) {
    const viewing = viewings.find(v => v.id === viewingId);
    if (!viewing || viewing.status !== 'suggested') return;

    viewing.status = 'confirmed';
    viewing.confirmedTime = viewing.suggestedTime;
    
    const property = properties.find(p => p.id === viewing.propertyId);
    
    addTenantMessage(viewing.tenantId,
        `✅ Viewing at ${property.name} (${property.postcode}) confirmed for ${viewing.confirmedTime}`
    );

    updateAllViews();
}

function declineSuggestedTime(viewingId) {
    const viewing = viewings.find(v => v.id === viewingId);
    if (!viewing || viewing.status !== 'suggested') return;

    viewing.status = 'declined';
    
    const property = properties.find(p => p.id === viewing.propertyId);
    
    addTenantMessage(viewing.tenantId,
        `You declined the suggested time for ${property.postcode}. Request cancelled.`
    );

    updateAllViews();
}

function calculateOptimalNextSlot(tenantId, propertyId, requestedTime) {
    const property = properties.find(p => p.id === propertyId);
    const requestedMinutes = parseTime(requestedTime);
    
    // Try slots starting 15 minutes after requested time
    const slots = getTimeSlots();
    const startIndex = slots.findIndex(s => parseTime(s) > requestedMinutes);
    
    for (let i = startIndex; i < slots.length; i++) {
        const testTime = slots[i];
        const feasibility = checkViewingFeasibility(tenantId, propertyId, testTime);
        
        if (feasibility.feasible) {
            return testTime;
        }
    }
    
    return null;
}

// ============================================
// UI UPDATES
// ============================================

function updateAllViews() {
    updateTenantView();
    updateAgentView();
    updateMetrics();
}

function updateTenantView() {
    updatePropertySelect();
    updateTenantItinerary();
}

function updatePropertySelect() {
    const select = document.getElementById('property-select');
    select.innerHTML = '<option value="">-- Select property --</option>';
    
    properties.forEach(prop => {
        const option = document.createElement('option');
        option.value = prop.id;
        option.textContent = `${prop.name} (${prop.postcode})`;
        select.appendChild(option);
    });
}

function updateTimeSlotSelect(propertyId) {
    const select = document.getElementById('time-slot-select');
    const availableSlots = getAvailableTimeSlots(propertyId);
    
    // Clear existing options
    select.innerHTML = '';
    
    if (availableSlots.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No available slots';
        option.disabled = true;
        select.appendChild(option);
    } else {
        availableSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot;
            option.textContent = slot;
            select.appendChild(option);
        });
    }
}

function updateTenantItinerary() {
    const container = document.getElementById('tenant-itinerary');
    const tenantViewings = viewings
        .filter(v => v.tenantId === currentTenantId)
        .sort((a, b) => {
            const timeA = a.confirmedTime || a.requestedTime || a.suggestedTime || '';
            const timeB = b.confirmedTime || b.requestedTime || b.suggestedTime || '';
            return timeA.localeCompare(timeB);
        });

    if (tenantViewings.length === 0) {
        container.innerHTML = '<p class="info-text">No viewings scheduled yet. Request a viewing to get started.</p>';
        return;
    }

    let html = '<div class="itinerary-items">';
    tenantViewings.forEach(viewing => {
        const property = properties.find(p => p.id === viewing.propertyId);
        let statusClass = 'pending';
        let statusText = 'Pending confirmation';
        let statusIcon = '⏳';
        
        if (viewing.status === 'confirmed') {
            statusClass = 'confirmed';
            statusText = 'Confirmed';
            statusIcon = '✅';
        } else if (viewing.status === 'suggested') {
            statusClass = 'suggested';
            statusText = 'Suggested new time';
            statusIcon = '🕐';
        } else if (viewing.status === 'declined') {
            statusClass = 'declined';
            statusText = 'Declined';
            statusIcon = '❌';
        }
        
        const time = viewing.confirmedTime || viewing.suggestedTime || viewing.requestedTime;
        
        html += `<div class="itinerary-item ${statusClass}">`;
        html += `<div class="item-time">${time}</div>`;
        html += `<div class="item-details">`;
        html += `<strong>${property.name}</strong><br>`;
        html += `<span class="postcode">${property.postcode}</span>`;
        if (viewing.suggestedTime && viewing.suggestedTime !== viewing.requestedTime) {
            html += `<br><span style="color: #ff9800; font-size: 0.9em;">Requested: ${viewing.requestedTime} → Suggested: ${viewing.suggestedTime}</span>`;
        }
        if (viewing.travelTime) {
            html += ` • ${viewing.travelTime} min travel`;
        }
        html += `</div>`;
        html += `<div class="item-status">`;
        html += `${statusIcon} ${statusText}`;
        if (viewing.status === 'suggested') {
            html += `<div class="item-actions" style="margin-top: 8px; display: flex; gap: 8px;">`;
            html += `<button class="btn-accept" onclick="acceptSuggestedTime(${viewing.id})" style="padding: 6px 12px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">Accept</button>`;
            html += `<button class="btn-decline-small" onclick="declineSuggestedTime(${viewing.id})" style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">Decline</button>`;
            html += `</div>`;
        }
        html += `</div>`;
        html += `</div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function addTenantMessage(tenantId, message) {
    if (tenantId !== currentTenantId) return;
    
    const container = document.getElementById('tenant-messages');
    const messageEl = document.createElement('div');
    messageEl.className = 'message-bubble';
    messageEl.textContent = message;
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

function updateAgentView() {
    updateAgentProperties();
    updateAgentTimeline();
    updatePendingRequests();
}

function updateAgentProperties() {
    const container = document.getElementById('agent-properties-list');
    const agentProperties = properties.filter(p => p.agentId === currentAgentId);
    
    let html = '';
    agentProperties.forEach(prop => {
        const confirmedCount = viewings.filter(v => 
            v.propertyId === prop.id && v.status === 'confirmed'
        ).length;
        
        html += `<div class="property-item">`;
        html += `<div class="property-name">${prop.name}</div>`;
        html += `<div class="property-postcode">${prop.postcode}</div>`;
        html += `<div class="property-bookings">${confirmedCount} confirmed</div>`;
        html += `</div>`;
    });
    container.innerHTML = html || '<p class="info-text">No properties</p>';
}

function updateAgentTimeline() {
    const container = document.getElementById('agent-timeline');
    // Timeline only shows confirmed viewings
    const agentViewings = viewings.filter(v => v.agentId === currentAgentId && v.status === 'confirmed')
        .sort((a, b) => a.confirmedTime.localeCompare(b.confirmedTime));
    
    // Create timeline slots (09:00 - 18:00, 30-min intervals)
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
        slots.push({ time: formatTime(hour * 60), minutes: hour * 60 });
        slots.push({ time: formatTime(hour * 60 + 30), minutes: hour * 60 + 30 });
    }
    
    let html = '<div class="timeline-slots">';
    slots.forEach(slot => {
        const slotViewings = agentViewings.filter(v => {
            const viewingTime = parseTime(v.confirmedTime || '');
            return viewingTime === slot.minutes;
        });
        
        let statusClass = 'empty';
        let statusIcon = '';
        let statusText = '';
        
        if (slotViewings.length > 0) {
            const viewing = slotViewings[0];
            statusClass = 'confirmed';
            statusIcon = '🟩';
            statusText = 'Confirmed';
            if (viewing.autoRescheduled || viewing.adjusted) {
                statusClass += ' auto-rescheduled-slot';
            }
        }
        
        html += `<div class="timeline-slot ${statusClass}" data-time="${slot.time}">`;
        html += `<div class="slot-time">${slot.time}</div>`;
        html += `<div class="slot-status">${statusIcon} ${statusText}</div>`;
        if (slotViewings.length > 0) {
            const viewing = slotViewings[0];
            const property = properties.find(p => p.id === viewing.propertyId);
            const tenant = tenants.find(t => t.id === viewing.tenantId);
            const cluster = getPostcodeCluster(property.postcode);
            html += `<div class="slot-details">${property.postcode} - ${tenant.name}</div>`;
            html += `<div class="slot-details" style="font-size: 0.75em; color: #666;">${cluster}</div>`;
            if (viewing.autoRescheduled || viewing.adjusted) {
                html += `<div class="slot-details" style="font-size: 0.7em; color: #ff9800;">🔄 Auto-scheduled</div>`;
            }
        }
        html += `</div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function updatePendingRequests() {
    const container = document.getElementById('pending-requests');
    const pending = viewings.filter(v => 
        v.agentId === currentAgentId && 
        (v.status === 'pending' || v.status === 'suggested')
    );

    if (pending.length === 0) {
        container.innerHTML = '<p class="info-text">No pending requests</p>';
        return;
    }

    let html = '<div class="requests-items">';
    pending.forEach(viewing => {
        const property = properties.find(p => p.id === viewing.propertyId);
        const tenant = tenants.find(t => t.id === viewing.tenantId);
        const requestedTime = viewing.requestedTime;
        const suggestedTime = viewing.suggestedTime;
        
        // Get feasibility status
        let feasibilityStatus;
        if (viewing.feasibilityStatus) {
            // Use stored status or recalculate
            const statusMap = {
                'ok': { status: 'ok', label: 'OK', color: '#4caf50' },
                'tight': { status: 'tight', label: 'Tight', color: '#ff9800' },
                'conflict': { status: 'conflict', label: 'Conflict', color: '#f44336' }
            };
            feasibilityStatus = statusMap[viewing.feasibilityStatus] || getFeasibilityStatus(viewing.agentId, viewing.propertyId, requestedTime);
        } else {
            feasibilityStatus = getFeasibilityStatus(viewing.agentId, viewing.propertyId, requestedTime);
        }
        
        const feasibilityBadge = `<span style="background: ${feasibilityStatus.color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-left: 8px;">${feasibilityStatus.label}</span>`;
        
        html += `<div class="request-item">`;
        html += `<div class="request-header">`;
        html += `<strong>${tenant.name}</strong> - ${property.name} ${feasibilityBadge}`;
        html += `</div>`;
        html += `<div class="request-details">`;
        html += `${property.postcode} • ${suggestedTime || requestedTime}`;
        if (viewing.travelTime) {
            html += ` • Travel: ${viewing.travelTime} min`;
        }
        if (suggestedTime && suggestedTime !== requestedTime) {
            html += `<br><span style="color: #ff9800;">Requested: ${requestedTime} → Suggested: ${suggestedTime}</span>`;
        }
        html += `</div>`;
        html += `<div class="request-actions">`;
        if (viewing.status === 'pending') {
            html += `<button class="btn-confirm" onclick="confirmViewing(${viewing.id})">✅ Confirm</button>`;
            html += `<button class="btn-suggest" onclick="suggestAlternativeTime(${viewing.id})">⚙️ Suggest Time</button>`;
            html += `<button class="btn-decline" onclick="declineViewing(${viewing.id})">❌ Decline</button>`;
        } else if (viewing.status === 'suggested') {
            html += `<span style="color: #666; font-size: 0.9em;">Waiting for tenant response</span>`;
        }
        html += `</div>`;
        html += `</div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function updateMetrics() {
    const container = document.getElementById('metrics-container');
    
    const allConfirmed = viewings.filter(v => v.status === 'confirmed');
    const totalViewings = allConfirmed.length;
    const pending = viewings.filter(v => v.status === 'pending' || v.status === 'suggested').length;
    
    // Calculate total travel time (agent perspective)
    let totalTravelTime = 0;
    agents.forEach(agent => {
        const agentViewings = viewings
            .filter(v => v.agentId === agent.id && v.status === 'confirmed')
            .sort((a, b) => a.confirmedTime.localeCompare(b.confirmedTime));
        
        for (let i = 1; i < agentViewings.length; i++) {
            const prev = properties.find(p => p.id === agentViewings[i-1].propertyId);
            const curr = properties.find(p => p.id === agentViewings[i].propertyId);
            totalTravelTime += getBaseTravelTime(prev.postcode, curr.postcode);
        }
    });
    
    let html = '<div class="metrics-grid">';
    html += `<div class="metric-card">
        <h3>Total Viewings</h3>
        <div class="value">${totalViewings}</div>
        <div class="unit">confirmed</div>
    </div>`;
    html += `<div class="metric-card">
        <h3>Pending Requests</h3>
        <div class="value">${pending}</div>
        <div class="unit">awaiting action</div>
    </div>`;
    html += `<div class="metric-card">
        <h3>Total Travel Time</h3>
        <div class="value">${totalTravelTime}</div>
        <div class="unit">minutes</div>
    </div>`;
    html += `<div class="metric-card">
        <h3>Efficiency</h3>
        <div class="value">${totalViewings > 0 ? 'Active' : '--'}</div>
        <div class="unit">route optimized</div>
    </div>`;
    html += '</div>';
    container.innerHTML = html;
}

function calculateRandomTravelTime() {
    // Simulate random scheduling per tenant
    let total = 0;
    
    tenants.forEach(tenant => {
        const tenantViewings = viewings
            .filter(v => v.tenantId === tenant.id && v.status === 'confirmed')
            .sort((a, b) => a.confirmedTime.localeCompare(b.confirmedTime));
        
        if (tenantViewings.length < 2) return;
        
        // Calculate actual travel time (optimized)
        let optimized = 0;
        for (let i = 1; i < tenantViewings.length; i++) {
            const prev = properties.find(p => p.id === tenantViewings[i-1].propertyId);
            const curr = properties.find(p => p.id === tenantViewings[i].propertyId);
            optimized += getBaseTravelTime(prev.postcode, curr.postcode);
        }
        
        // Simulate random order
        const shuffled = [...tenantViewings].sort(() => Math.random() - 0.5);
        let random = 0;
        for (let i = 1; i < shuffled.length; i++) {
            const prev = properties.find(p => p.id === shuffled[i-1].propertyId);
            const curr = properties.find(p => p.id === shuffled[i].propertyId);
            random += getBaseTravelTime(prev.postcode, curr.postcode);
        }
        
        total += random;
    });
    
    return total;
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Setup event listeners
    document.getElementById('tenant-selector').addEventListener('change', (e) => {
        currentTenantId = parseInt(e.target.value);
        updateAllViews();
        // Clear messages when switching tenants
        document.getElementById('tenant-messages').innerHTML = '<p class="info-text">Messages will appear here</p>';
    });
    
    const agentSelector = document.getElementById('agent-selector');
    if (agentSelector) {
        agentSelector.addEventListener('change', (e) => {
            currentAgentId = parseInt(e.target.value);
            updateAllViews();
            // Update dashboard if it exists
            if (typeof updateAgentNameDisplay === 'function') {
                updateAgentNameDisplay();
            }
        });
    }
    
    document.getElementById('property-select').addEventListener('change', (e) => {
        const propertyId = parseInt(e.target.value);
        if (propertyId) {
            updateTimeSlotSelect(propertyId);
        } else {
            // Reset to all slots
            const select = document.getElementById('time-slot-select');
            select.innerHTML = '';
            getTimeSlots().forEach(slot => {
                const option = document.createElement('option');
                option.value = slot;
                option.textContent = slot;
                select.appendChild(option);
            });
        }
    });
    
    document.getElementById('request-viewing-btn').addEventListener('click', () => {
        const propertyId = parseInt(document.getElementById('property-select').value);
        const time = document.getElementById('time-slot-select').value;
        
        if (!propertyId) {
            alert('Please select a property');
            return;
        }
        
        if (!time) {
            alert('Please select an available time slot');
            return;
        }
        
        requestViewing(currentTenantId, propertyId, time);
    });
    
    document.getElementById('travel-tolerance').addEventListener('input', (e) => {
        travelTolerance = parseInt(e.target.value);
        document.getElementById('travel-tolerance-value').textContent = travelTolerance;
    });
    
    // Notification close button
    document.getElementById('notification-close').addEventListener('click', () => {
        document.getElementById('notification-toast').classList.add('hidden');
    });
    
    // Initial render
    updateAllViews();
});

// Make functions available globally
window.confirmViewing = confirmViewing;
window.suggestAlternativeTime = suggestAlternativeTime;
window.declineViewing = declineViewing;
window.acceptSuggestedTime = acceptSuggestedTime;
window.declineSuggestedTime = declineSuggestedTime;
