// Tenant Booking Form Logic
// This connects to the same scheduling engine

// Get booking parameters from URL (e.g., ?agent=alex&property=w2flat)
const urlParams = new URLSearchParams(window.location.search);
const agentSlug = urlParams.get('agent') || 'alex';
const propertySlug = urlParams.get('property') || 'w2flat';

// Map slugs to actual IDs (in production, this would come from a database)
const agentMap = {
    'alex': 1,
    'maria': 2,
    'david': 3
};

const propertyMap = {
    'w2flat': 1,
    'nottinghill': 2,
    'soho': 3,
    'islington': 4,
    'mayfair': 5,
    'camden': 6,
    'shoreditch': 7,
    'clapham': 8,
    'greenwich': 9,
    'canarywharf': 10
};

let selectedPropertyId = propertyMap[propertySlug] || 1;
let selectedAgentId = agentMap[agentSlug] || 1;
let selectedTimeSlot = null;

// Import properties and functions from main scheduler
// In production, this would be a shared module or API
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

const agents = [
    { id: 1, name: "Alex" },
    { id: 2, name: "Maria" },
    { id: 3, name: "David" }
];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadPropertyInfo();
    loadAvailableSlots();
    setupFormHandlers();
    setupStatusPolling();
});

// Real-time status updates (storage events only, no polling)
function setupStatusPolling() {
    // Listen for storage events to detect agent responses
    const handleStorageChange = () => {
        checkViewingStatus();
        // Refresh available slots when viewings change (agent might have confirmed a viewing)
        loadAvailableSlots();
    };
    
    window.addEventListener('storage', handleStorageChange);
}

function checkViewingStatus() {
    // Get the most recent viewing for this tenant (by email or latest)
    const viewings = JSON.parse(localStorage.getItem('nestfinder_viewings') || '[]');
    const tenantEmail = document.getElementById('tenant-email')?.value;
    
    if (!tenantEmail) return;
    
    // Find viewing with matching email
    const viewing = viewings
        .filter(v => v.email === tenantEmail)
        .sort((a, b) => b.id - a.id)[0]; // Most recent
    
    if (!viewing) return;
    
    // Check if status changed
    if (viewing.status === 'confirmed') {
        showConfirmationMessage();
    } else if (viewing.status === 'declined') {
        showDeclinedMessage();
    }
}

function showConfirmationMessage() {
    const successScreen = document.getElementById('success-screen');
    if (successScreen && !successScreen.classList.contains('hidden')) {
        const agentName = document.getElementById('agent-name-confirmation')?.textContent || 'Agent';
        document.getElementById('agent-name-confirmation').textContent = 
            agentName.replace('will confirm shortly', 'has confirmed your viewing! ✅');
    }
}

function showDeclinedMessage() {
    const successScreen = document.getElementById('success-screen');
    if (successScreen) {
        successScreen.innerHTML = `
            <div class="success-icon">❌</div>
            <h2>Viewing Declined</h2>
            <p>Unfortunately, your viewing request was declined.</p>
            <button class="btn-close" onclick="closeSuccessScreen()">Close</button>
        `;
        successScreen.classList.remove('hidden');
    }
}

function loadPropertyInfo() {
    const property = properties.find(p => p.id === selectedPropertyId);
    if (!property) return;

    document.getElementById('property-title').textContent = property.name;
    document.getElementById('property-location').textContent = `${property.postcode}, London`;
    document.getElementById('property-bedrooms').textContent = `${property.bedrooms} bed`;
    document.getElementById('property-price').textContent = `£${property.price.toLocaleString()}/month`;

    const agent = agents.find(a => a.id === selectedAgentId);
    if (agent) {
        document.getElementById('agent-name-confirmation').textContent = `${agent.name} will confirm shortly.`;
    }
}

function loadAvailableSlots() {
    // Load properties and viewings from localStorage
    const storedProperties = JSON.parse(localStorage.getItem('nestfinder_properties') || '[]');
    const storedViewings = JSON.parse(localStorage.getItem('nestfinder_viewings') || '[]');
    
    // Check if selected property exists in localStorage, if not use hardcoded properties
    let propertyForBooking = storedProperties.find(p => p.id === selectedPropertyId);
    
    // If property not in localStorage, use hardcoded properties array
    if (!propertyForBooking) {
        propertyForBooking = properties.find(p => p.id === selectedPropertyId);
        // Add it to localStorage for future use
        if (propertyForBooking) {
            const propertiesToSave = [...storedProperties, {
                id: propertyForBooking.id,
                title: propertyForBooking.name,
                address: '',
                postcode: propertyForBooking.postcode,
                rent: propertyForBooking.price,
                status: 'active',
                agentId: propertyForBooking.agentId
            }];
            localStorage.setItem('nestfinder_properties', JSON.stringify(propertiesToSave));
        }
    }
    
    // Map localStorage properties to format expected by scheduling functions
    const propertiesForScheduling = storedProperties.length > 0 
        ? storedProperties.map(p => ({
            id: p.id,
            name: p.title || p.name,
            postcode: p.postcode,
            agentId: p.agentId || 1
        }))
        : properties.map(p => ({
            id: p.id,
            name: p.name,
            postcode: p.postcode,
            agentId: p.agentId
        }));
    
    // Map localStorage viewings to format expected by scheduling functions
    const viewingsForScheduling = storedViewings
        .filter(v => v.status === 'confirmed' && v.propertyId)
        .map(v => ({
            id: v.id,
            agentId: v.agentId || 1,
            propertyId: v.propertyId,
            confirmedTime: v.time,
            status: 'confirmed'
        }));
    
    // Use scheduling logic to get available slots
    const availableSlots = getAvailableTimeSlots(selectedPropertyId, propertiesForScheduling, viewingsForScheduling);
    
    const container = document.getElementById('available-slots');
    container.innerHTML = '';

    // Get all possible slots
    const allSlots = getTimeSlots();
    
    allSlots.forEach(slot => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'time-slot-btn';
        btn.textContent = slot;
        btn.dataset.time = slot;
        
        // Check if slot is in available slots list
        if (availableSlots.includes(slot)) {
            btn.addEventListener('click', () => selectTimeSlot(slot, btn));
        } else {
            btn.classList.add('disabled');
            btn.disabled = true;
        }
        
        container.appendChild(btn);
    });
}

function getTimeSlots() {
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
        slots.push(`${String(hour).padStart(2, '0')}:00`);
        slots.push(`${String(hour).padStart(2, '0')}:30`);
    }
    return slots;
}

// Scheduling functions (extracted from scheduler.js)
const VIEWING_DURATION = 20;
const TRAVEL_BUFFER = 10;

const postcodeCoords = {
    "W2 4DX": [51.515, -0.183],
    "W11 2BQ": [51.515, -0.196],
    "W1D 4HT": [51.515, -0.131],
    "N1 9GU": [51.536, -0.106],
    "W1K 6TF": [51.509, -0.150],
    "NW1 7AB": [51.539, -0.142],
    "E1 6AN": [51.524, -0.081],
    "SW4 0LG": [51.465, -0.138],
    "SE10 9RT": [51.483, 0.008],
    "E14 5AB": [51.505, -0.020]
};

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

function getBaseTravelTime(fromPostcode, toPostcode) {
    if (fromPostcode === toPostcode) return 0;
    const from = postcodeCoords[fromPostcode];
    const to = postcodeCoords[toPostcode];
    if (!from || !to) return 30;
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
    const variation = Math.floor(Math.random() * 21) - 10;
    return Math.max(5, base + variation);
}

function checkAgentSlotFeasibility(agentId, time, propertyId, properties, viewings) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return { feasible: false, reason: "Property not found" };
    
    const timeMinutes = parseTime(time);
    const viewingEnd = addMinutes(timeMinutes, VIEWING_DURATION);
    
    const agentViewings = viewings.filter(v => 
        v.agentId === agentId && v.status === 'confirmed'
    ).sort((a, b) => {
        const timeA = a.confirmedTime || a.time;
        const timeB = b.confirmedTime || b.time;
        return timeA.localeCompare(timeB);
    });
    
    for (const viewing of agentViewings) {
        const viewingTime = viewing.confirmedTime || viewing.time;
        const viewingStart = parseTime(viewingTime);
        const viewingEndTime = addMinutes(viewingStart, VIEWING_DURATION);
        
        if ((timeMinutes >= viewingStart && timeMinutes < viewingEndTime) ||
            (viewingStart >= timeMinutes && viewingStart < viewingEnd)) {
            return { feasible: false, reason: "Agent has viewing at this time" };
        }
    }
    
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

function getAvailableTimeSlots(propertyId, properties, viewings) {
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

function selectTimeSlot(time, button) {
    selectedTimeSlot = time;
    
    // Update UI
    document.querySelectorAll('.time-slot-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    
    // Enable submit button
    document.getElementById('submit-booking').disabled = false;
}

function setupFormHandlers() {
    document.getElementById('booking-form').addEventListener('submit', (e) => {
        e.preventDefault();
        submitBooking();
    });

    document.getElementById('smart-profile').addEventListener('submit', (e) => {
        e.preventDefault();
        saveProfile();
    });
}

function submitBooking() {
    if (!selectedTimeSlot) {
        alert('Please select a time slot');
        return;
    }

    const formData = {
        name: document.getElementById('tenant-name').value,
        email: document.getElementById('tenant-email').value,
        phone: document.getElementById('tenant-phone').value,
        moveInDate: document.getElementById('move-in-date').value,
        occupation: document.getElementById('occupation').value,
        income: document.getElementById('income').value,
        propertyId: selectedPropertyId,
        agentId: selectedAgentId,
        requestedTime: selectedTimeSlot
    };

    // Get property info
    const property = properties.find(p => p.id === selectedPropertyId);
    
    // Load existing viewings from localStorage
    const existingViewings = JSON.parse(localStorage.getItem('nestfinder_viewings') || '[]');
    
    // Create new viewing object
    const newViewing = {
        id: Date.now(), // Simple ID generation
        tenant: formData.name,
        property: property?.name || 'Unknown Property',
        propertyPostcode: property?.postcode || '',
        propertyId: selectedPropertyId, // Required for scheduling logic
        agentId: selectedAgentId, // Required for scheduling logic
        time: selectedTimeSlot,
        status: 'pending',
        email: formData.email,
        phone: formData.phone,
        moveInDate: formData.moveInDate,
        occupation: formData.occupation,
        income: formData.income
    };
    
    // Add to viewings array and save
    existingViewings.push(newViewing);
    localStorage.setItem('nestfinder_viewings', JSON.stringify(existingViewings));
    
    // Trigger storage event so agent dashboard can detect it (with delay to avoid race conditions)
    setTimeout(() => {
        window.dispatchEvent(new Event('storage'));
    }, 100);
    
    console.log('Booking submitted and saved to localStorage:', newViewing);
    
    // Show success screen
    document.querySelector('.booking-form-container').style.display = 'none';
    document.getElementById('success-screen').classList.remove('hidden');
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    // In production: Send SMS/email confirmation
    // sendConfirmation(formData);
}

function showProfileForm() {
    document.getElementById('profile-form').classList.remove('hidden');
    document.getElementById('success-screen').scrollIntoView({ behavior: 'smooth' });
}

function skipProfile() {
    document.getElementById('profile-form').classList.add('hidden');
}

function saveProfile() {
    const profileData = {
        email: document.getElementById('tenant-email').value,
        employmentStatus: document.querySelector('[name="employmentStatus"]').value,
        references: document.querySelector('[name="references"]').checked,
        preferredAreas: document.querySelector('[name="preferredAreas"]').value
    };
    
    console.log('Profile saved:', profileData);
    
    // In production, save to database
    alert('Profile saved! Future bookings will be faster.');
    document.getElementById('profile-form').classList.add('hidden');
}

function closeSuccessScreen() {
    // In production, might redirect or close window
    window.location.reload();
}

