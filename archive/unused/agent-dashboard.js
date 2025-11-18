// Agent Dashboard Logic
let currentView = 'dashboard';

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupTabs();
    loadDashboard();
    setupNotificationClose();
    updateAgentNameDisplay();
});

function updateAgentNameDisplay() {
    const agent = agents.find(a => a.id === currentAgentId);
    if (agent) {
        const nameDisplay = document.getElementById('agent-name-display');
        if (nameDisplay) {
            nameDisplay.textContent = agent.name;
        }
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
        });
    });
}

function switchView(viewName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        }
    });

    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${viewName}-view`).classList.add('active');

    currentView = viewName;

    // Load view-specific content
    if (viewName === 'properties') {
        loadProperties();
    } else if (viewName === 'dashboard') {
        loadDashboard();
    }
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Update buttons
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update panels
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(`${tab}-tab`).classList.add('active');
            
            // Load tab content
            loadTabContent(tab);
        });
    });
}

function loadDashboard() {
    updateSmartSummary();
    loadTabContent('pending');
}

function updateSmartSummary() {
    // Get data from scheduler
    const agentViewings = viewings.filter(v => 
        v.agentId === currentAgentId && v.status === 'confirmed'
    );
    
    const today = new Date().toISOString().split('T')[0];
    const todayViewings = agentViewings.filter(v => {
        // Simplified - in production would check actual date
        return true;
    });
    
    document.getElementById('today-viewings-count').textContent = todayViewings.length;
    
    // Calculate route
    if (todayViewings.length > 0) {
        const route = todayViewings
            .sort((a, b) => a.confirmedTime.localeCompare(b.confirmedTime))
            .map(v => {
                const prop = properties.find(p => p.id === v.propertyId);
                return prop.postcode.split(' ')[0];
            })
            .join(' → ');
        document.getElementById('today-route').textContent = route;
    }
    
    // Calculate avg travel time
    let totalTravel = 0;
    for (let i = 1; i < todayViewings.length; i++) {
        const prev = properties.find(p => p.id === todayViewings[i-1].propertyId);
        const curr = properties.find(p => p.id === todayViewings[i].propertyId);
        totalTravel += getBaseTravelTime(prev.postcode, curr.postcode);
    }
    const avgTravel = todayViewings.length > 1 
        ? Math.round(totalTravel / (todayViewings.length - 1))
        : 0;
    document.getElementById('avg-travel-time').textContent = avgTravel > 0 ? `${avgTravel} min` : '--';
    
    // Pending count
    const pending = viewings.filter(v => 
        v.agentId === currentAgentId && v.status === 'pending'
    ).length;
    document.getElementById('pending-count').textContent = pending;
}

function loadTabContent(tab) {
    if (tab === 'pending') {
        updatePendingRequestsList();
    } else if (tab === 'confirmed') {
        updateAgentTimeline();
    } else if (tab === 'declined') {
        updateDeclinedRequests();
    } else if (tab === 'past') {
        updatePastViewings();
    }
}

function updatePendingRequestsList() {
    const container = document.getElementById('pending-requests-list');
    const pending = viewings.filter(v => 
        v.agentId === currentAgentId && 
        (v.status === 'pending' || v.status === 'suggested')
    );

    if (pending.length === 0) {
        container.innerHTML = '<p class="info-text">No pending requests</p>';
        return;
    }

    let html = '';
    pending.forEach(viewing => {
        const property = properties.find(p => p.id === viewing.propertyId);
        const tenant = tenants.find(t => t.id === viewing.tenantId);
        const feasibilityStatus = getFeasibilityStatus(viewing.agentId, viewing.propertyId, viewing.requestedTime);
        
        html += `<div class="request-item-dashboard">
            <div class="request-header-dashboard">
                <div>
                    <strong>${tenant.name}</strong>
                    <span class="feasibility-badge" style="background: ${feasibilityStatus.color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-left: 10px;">${feasibilityStatus.label}</span>
                </div>
                <div class="request-time">${viewing.requestedTime}</div>
            </div>
            <div class="request-details-dashboard">
                ${property.name} • ${property.postcode}
                ${viewing.travelTime ? ` • ${viewing.travelTime} min travel` : ''}
            </div>
            <div class="request-actions-dashboard">
                <button class="btn-confirm" onclick="confirmViewing(${viewing.id})">✅ Confirm</button>
                <button class="btn-suggest" onclick="suggestAlternativeTime(${viewing.id})">⚙️ Suggest Time</button>
                <button class="btn-decline" onclick="declineViewing(${viewing.id})">❌ Decline</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function updateDeclinedRequests() {
    const container = document.getElementById('declined-requests-list');
    const declined = viewings.filter(v => 
        v.agentId === currentAgentId && v.status === 'declined'
    );

    if (declined.length === 0) {
        container.innerHTML = '<p class="info-text">No declined requests</p>';
        return;
    }

    let html = '';
    declined.forEach(viewing => {
        const property = properties.find(p => p.id === viewing.propertyId);
        const tenant = tenants.find(t => t.id === viewing.tenantId);
        
        html += `<div class="request-item-dashboard">
            <div class="request-header-dashboard">
                <strong>${tenant.name}</strong>
                <span class="request-time">${viewing.requestedTime}</span>
            </div>
            <div class="request-details-dashboard">
                ${property.name} • ${property.postcode}
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function updatePastViewings() {
    const container = document.getElementById('past-viewings-list');
    // Simplified - in production would filter by date
    container.innerHTML = '<p class="info-text">Past viewings will appear here</p>';
}

function loadProperties() {
    const container = document.getElementById('properties-grid');
    const agentProperties = properties.filter(p => p.agentId === currentAgentId);
    
    if (agentProperties.length === 0) {
        container.innerHTML = '<p class="info-text">No properties added yet</p>';
        return;
    }

    let html = '';
    agentProperties.forEach(prop => {
        const agent = agents.find(a => a.id === currentAgentId);
        const agentSlug = agent?.name.toLowerCase() || 'agent';
        const propertySlug = prop.postcode.toLowerCase().replace(' ', '').replace(/[^a-z0-9]/g, '');
        const bookingLink = `nestfinder.uk/${agentSlug}/${propertySlug}`;
        
        html += `<div class="property-card-dashboard" onclick="showPropertyModal(${prop.id})">
            <h3>${prop.name}</h3>
            <span class="postcode">${prop.postcode}</span>
            <div class="details">${prop.bedrooms} bed • £${prop.price.toLocaleString()}/month</div>
            <div class="booking-link-preview">📅 ${bookingLink}</div>
        </div>`;
    });
    container.innerHTML = html;
}

function showPropertyModal(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    const agent = agents.find(a => a.id === currentAgentId);
    const agentSlug = agent?.name.toLowerCase() || 'agent';
    const propertySlug = property.postcode.toLowerCase().replace(' ', '').replace(/[^a-z0-9]/g, '');
    const bookingLink = `nestfinder.uk/${agentSlug}/${propertySlug}`;
    
    document.getElementById('modal-property-name').textContent = property.name;
    document.getElementById('booking-link').value = `https://${bookingLink}`;
    document.getElementById('property-modal').classList.add('active');
    document.getElementById('property-modal').classList.remove('hidden');
}

function closePropertyModal() {
    document.getElementById('property-modal').classList.remove('active');
    document.getElementById('property-modal').classList.add('hidden');
}

function copyBookingLink() {
    const linkInput = document.getElementById('booking-link');
    linkInput.select();
    document.execCommand('copy');
    alert('Booking link copied to clipboard!');
}

function showAddPropertyModal() {
    alert('Add property feature - coming soon!');
}

function addBlock() {
    alert('Add availability block - coming soon!');
}

function setupNotificationClose() {
    const closeBtn = document.getElementById('notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('notification-toast').classList.add('hidden');
        });
    }
}

// Override updateAllViews to also update dashboard
const originalUpdateAllViews = window.updateAllViews;
window.updateAllViews = function() {
    if (originalUpdateAllViews) originalUpdateAllViews();
    if (currentView === 'dashboard') {
        updateSmartSummary();
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'pending';
        loadTabContent(activeTab);
    }
};

// Make functions available globally
window.showPropertyModal = showPropertyModal;
window.closePropertyModal = closePropertyModal;
window.copyBookingLink = copyBookingLink;
window.showAddPropertyModal = showAddPropertyModal;
window.addBlock = addBlock;

