// Storage utilities for localStorage persistence

const PROPERTIES_KEY = 'nestfinder_properties';
const VIEWINGS_KEY = 'nestfinder_viewings';

// Seed data for properties
const seedProperties = () => [
  {
    id: 1,
    title: 'Modern Flat in Paddington',
    address: '123 Main Street',
    postcode: 'W2 4DX',
    rent: 1800,
    status: 'active',
    agentId: 1 // Required for scheduling logic
  },
  {
    id: 2,
    title: 'Victorian House in Notting Hill',
    address: '456 Notting Hill Gate',
    postcode: 'W11 2BQ',
    rent: 3200,
    status: 'active',
    agentId: 1 // Required for scheduling logic
  }
];

// Seed data for viewings
const seedViewings = () => [
  {
    id: 1,
    tenant: 'Sarah',
    property: 'Modern Flat in Paddington',
    propertyPostcode: 'W2 4DX',
    propertyId: 1, // Required for scheduling logic
    agentId: 1, // Required for scheduling logic
    time: '10:00',
    status: 'pending',
    email: 'sarah@example.com',
    phone: '+44 7700 900001'
  },
  {
    id: 2,
    tenant: 'James',
    property: 'Victorian House in Notting Hill',
    propertyPostcode: 'W11 2BQ',
    propertyId: 2, // Required for scheduling logic
    agentId: 1, // Required for scheduling logic
    time: '14:30',
    status: 'pending',
    email: 'james@example.com',
    phone: '+44 7700 900002'
  }
];

// Properties functions
export function loadProperties() {
  try {
    const stored = localStorage.getItem(PROPERTIES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Seed with default data if empty
    const seed = seedProperties();
    saveProperties(seed);
    return seed;
  } catch (error) {
    console.error('Error loading properties:', error);
    return seedProperties();
  }
}

export function saveProperties(properties) {
  try {
    localStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
    // Trigger storage event for cross-tab communication (with delay to avoid race conditions)
    setTimeout(() => {
      window.dispatchEvent(new Event('storage'));
    }, 100);
  } catch (error) {
    console.error('Error saving properties:', error);
  }
}

// Viewings functions
export function loadViewings() {
  try {
    const stored = localStorage.getItem(VIEWINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Seed with default data if empty
    const seed = seedViewings();
    saveViewings(seed);
    return seed;
  } catch (error) {
    console.error('Error loading viewings:', error);
    return seedViewings();
  }
}

export function saveViewings(viewings) {
  try {
    localStorage.setItem(VIEWINGS_KEY, JSON.stringify(viewings));
    // Trigger storage event for cross-tab communication (with delay to avoid race conditions)
    setTimeout(() => {
      window.dispatchEvent(new Event('storage'));
    }, 100);
  } catch (error) {
    console.error('Error saving viewings:', error);
  }
}

// Watch for localStorage changes (for cross-tab communication)
export function watchStorage(callback) {
  window.addEventListener('storage', callback);
  // Also listen for custom storage events (for same-tab updates)
  window.addEventListener('storage', callback);
  
  return () => {
    window.removeEventListener('storage', callback);
  };
}

