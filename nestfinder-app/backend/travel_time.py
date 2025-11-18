"""
Travel time calculation and feasibility checking for viewing scheduling.
Port of logic from scheduler.js
"""
import math
from typing import Dict, List, Tuple, Optional

# Constants
VIEWING_DURATION = 20  # minutes
TRAVEL_BUFFER = 10  # minutes

# Postcode coordinates for London areas (full postcodes)
POSTCODE_COORDS: Dict[str, Tuple[float, float]] = {
    "W2 4DX": (51.515, -0.183),   # Paddington
    "W11 2BQ": (51.515, -0.196),  # Notting Hill
    "W1D 4HT": (51.515, -0.131),  # Soho
    "N1 9GU": (51.536, -0.106),   # Islington
    "W1K 6TF": (51.509, -0.150),  # Mayfair
    "NW1 7AB": (51.539, -0.142),  # Camden
    "E1 6AN": (51.524, -0.081),   # Shoreditch
    "SW4 0LG": (51.465, -0.138),  # Clapham
    "SE10 9RT": (51.483, 0.008),  # Greenwich
    "E14 5AB": (51.505, -0.020),  # Canary Wharf
    "W2 2PF": (51.515, -0.183),   # Paddington
    "EC2A 3AR": (51.524, -0.081), # Shoreditch
}

# Postcode prefix coordinates (for approximate geocoding)
POSTCODE_PREFIX_COORDS: Dict[str, Tuple[float, float]] = {
    "W1": (51.515, -0.145),   # West End
    "W2": (51.515, -0.183),   # Paddington
    "W11": (51.515, -0.196),  # Notting Hill
    "W10": (51.525, -0.220),  # North Kensington
    "W9": (51.525, -0.190),   # Maida Vale
    "W8": (51.500, -0.195),   # Kensington
    "SW1": (51.495, -0.140),  # Westminster
    "SW3": (51.490, -0.165),  # Chelsea
    "SW4": (51.465, -0.138),  # Clapham
    "SW5": (51.490, -0.190),  # Earl's Court
    "SW7": (51.495, -0.175),  # South Kensington
    "SW10": (51.485, -0.180), # West Brompton
    "N1": (51.536, -0.106),   # Islington
    "N7": (51.550, -0.120),   # Holloway
    "N19": (51.565, -0.130),  # Upper Holloway
    "NW1": (51.539, -0.142),  # Camden
    "NW3": (51.550, -0.165),  # Hampstead
    "NW5": (51.550, -0.140),  # Kentish Town
    "E1": (51.524, -0.081),   # Shoreditch
    "E2": (51.530, -0.075),   # Bethnal Green
    "E14": (51.505, -0.020),  # Canary Wharf
    "E8": (51.540, -0.070),   # Hackney
    "SE1": (51.500, -0.090),  # Southwark
    "SE10": (51.483, 0.008),  # Greenwich
    "SE11": (51.490, -0.110), # Kennington
    "EC1": (51.520, -0.095),  # Clerkenwell
    "EC2": (51.520, -0.085),  # City
    "EC3": (51.515, -0.080),  # City
    "EC4": (51.510, -0.095),  # Fleet Street
}


def extract_postcode_prefix(postcode: str) -> str:
    """Extract prefix from UK postcode (e.g., 'W2 4DX' -> 'W2')."""
    # Remove spaces and take first part (before space or first 2-3 chars)
    postcode_clean = postcode.strip().upper()
    if ' ' in postcode_clean:
        return postcode_clean.split(' ')[0]
    # If no space, take first 2-3 characters (W2, SW1, etc.)
    if len(postcode_clean) >= 2:
        # Check if it's a 2-char prefix (W2) or 3-char (SW1)
        if len(postcode_clean) >= 3 and postcode_clean[2].isdigit():
            return postcode_clean[:2]
        return postcode_clean[:2] if postcode_clean[1].isdigit() else postcode_clean[:3]
    return postcode_clean


def geocode_property(address: str, postcode: str, base_postcode: Optional[str] = None) -> Tuple[float, float]:
    """
    Geocode a property using postcode.
    Returns (latitude, longitude) tuple.
    
    Strategy:
    1. Check full postcode in POSTCODE_COORDS
    2. Check postcode prefix in POSTCODE_PREFIX_COORDS
    3. Fall back to base_postcode coordinates if provided
    4. Default fallback: Central London (51.507, -0.127)
    """
    postcode_upper = postcode.strip().upper()
    
    # Try full postcode first
    if postcode_upper in POSTCODE_COORDS:
        return POSTCODE_COORDS[postcode_upper]
    
    # Try postcode prefix
    prefix = extract_postcode_prefix(postcode_upper)
    if prefix in POSTCODE_PREFIX_COORDS:
        return POSTCODE_PREFIX_COORDS[prefix]
    
    # Fall back to base_postcode if provided
    if base_postcode:
        base_upper = base_postcode.strip().upper()
        if base_upper in POSTCODE_COORDS:
            return POSTCODE_COORDS[base_upper]
        base_prefix = extract_postcode_prefix(base_upper)
        if base_prefix in POSTCODE_PREFIX_COORDS:
            return POSTCODE_PREFIX_COORDS[base_prefix]
    
    # Default: Central London
    return (51.507, -0.127)


def get_base_travel_time(from_postcode: str, to_postcode: str) -> int:
    """Calculate base travel time between two postcodes using Haversine formula."""
    if from_postcode == to_postcode:
        return 0
    
    from_coords = POSTCODE_COORDS.get(from_postcode)
    to_coords = POSTCODE_COORDS.get(to_postcode)
    
    if not from_coords or not to_coords:
        return 30  # Default fallback
    
    # Haversine formula
    R = 6371  # Earth radius in km
    d_lat = math.radians(to_coords[0] - from_coords[0])
    d_lon = math.radians(to_coords[1] - from_coords[1])
    
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(from_coords[0])) *
         math.cos(math.radians(to_coords[0])) *
         math.sin(d_lon / 2) ** 2)
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    
    # Convert to minutes (assuming 30 km/h average speed + 5 min buffer)
    travel_time = (distance / 30) * 60 + 5
    return int(math.ceil(travel_time / 5) * 5)


def parse_time(time_str: str) -> int:
    """Convert time string (HH:MM) to minutes since midnight."""
    hours, minutes = map(int, time_str.split(':'))
    return hours * 60 + minutes


def format_time(minutes: int) -> str:
    """Convert minutes since midnight to time string (HH:MM)."""
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"


def add_minutes(time_minutes: int, minutes: int) -> int:
    """Add minutes to a time in minutes."""
    return time_minutes + minutes


def get_time_slots(start_hour: int = 9, end_hour: int = 18) -> List[str]:
    """Generate time slots between start and end hours (30-minute intervals)."""
    slots = []
    for hour in range(start_hour, end_hour):
        slots.append(format_time(hour * 60))
        slots.append(format_time(hour * 60 + 30))
    return slots


def check_agent_slot_feasibility(
    agent_id: int,
    time: str,
    property_id: int,
    property_postcode: str,
    confirmed_viewings: List[dict],
    properties_db: dict
) -> dict:
    """
    Check if a time slot is feasible for an agent given their confirmed viewings.
    
    Returns:
        dict with 'feasible' (bool) and optional 'reason' (str)
    """
    time_minutes = parse_time(time)
    viewing_end = add_minutes(time_minutes, VIEWING_DURATION)
    
    # Sort confirmed viewings by time
    sorted_viewings = sorted(
        [v for v in confirmed_viewings if v.get("status") == "confirmed" and v.get("agent_id") == agent_id],
        key=lambda v: parse_time(v.get("confirmed_time", v.get("requested_time", "00:00")))
    )
    
    # Check for direct time overlap
    for viewing in sorted_viewings:
        viewing_time = viewing.get("confirmed_time") or viewing.get("requested_time")
        if not viewing_time:
            continue
            
        viewing_start = parse_time(viewing_time)
        viewing_end_time = add_minutes(viewing_start, VIEWING_DURATION)
        
        # Check for overlap
        if ((time_minutes >= viewing_start and time_minutes < viewing_end_time) or
            (viewing_start >= time_minutes and viewing_start < viewing_end)):
            return {"feasible": False, "reason": "Agent has viewing at this time"}
    
    # Find previous and next viewings
    prev_viewing = None
    next_viewing = None
    
    for viewing in sorted_viewings:
        viewing_time = viewing.get("confirmed_time") or viewing.get("requested_time")
        if not viewing_time:
            continue
            
        viewing_start = parse_time(viewing_time)
        if viewing_start < time_minutes:
            prev_viewing = viewing
        elif viewing_start > time_minutes and not next_viewing:
            next_viewing = viewing
            break
    
    # Check travel time from previous viewing
    if prev_viewing:
        prev_property_id = prev_viewing.get("property_id")
        prev_property = properties_db.get(prev_property_id)
        
        if prev_property:
            prev_postcode = prev_property.get("postcode")
            if prev_postcode:
                travel_time = get_base_travel_time(prev_postcode, property_postcode)
                prev_viewing_time = prev_viewing.get("confirmed_time") or prev_viewing.get("requested_time")
                prev_viewing_end = add_minutes(parse_time(prev_viewing_time), VIEWING_DURATION)
                min_next_time = add_minutes(prev_viewing_end, TRAVEL_BUFFER + travel_time)
                
                if time_minutes < min_next_time:
                    return {
                        "feasible": False,
                        "reason": f"Insufficient travel time from {prev_postcode}"
                    }
    
    # Check travel time to next viewing
    if next_viewing:
        next_property_id = next_viewing.get("property_id")
        next_property = properties_db.get(next_property_id)
        
        if next_property:
            next_postcode = next_property.get("postcode")
            if next_postcode:
                travel_to_next = get_base_travel_time(property_postcode, next_postcode)
                this_viewing_end = add_minutes(time_minutes, VIEWING_DURATION)
                min_next_start = add_minutes(this_viewing_end, TRAVEL_BUFFER + travel_to_next)
                next_viewing_time = next_viewing.get("confirmed_time") or next_viewing.get("requested_time")
                next_start = parse_time(next_viewing_time)
                
                if min_next_start > next_start:
                    return {
                        "feasible": False,
                        "reason": "Insufficient time before next viewing"
                    }
    
    return {"feasible": True}


def get_available_time_slots(
    property_id: int,
    property_postcode: str,
    agent_id: int,
    availability_rules: List[dict],
    confirmed_viewings: List[dict],
    properties_db: dict
) -> List[str]:
    """
    Get available time slots for a property, filtered by availability and feasibility.
    
    Args:
        property_id: ID of the property
        property_postcode: Postcode of the property
        agent_id: ID of the agent
        availability_rules: List of availability rules (day_of_week: 0-6, enabled: bool, start_time, end_time)
        confirmed_viewings: List of confirmed viewings
        properties_db: Dictionary of all properties
    
    Returns:
        List of available time slot strings (HH:MM format)
    """
    # Get today's day_of_week (0=Monday, 1=Tuesday, ..., 6=Sunday)
    from datetime import datetime
    today = datetime.now()
    day_of_week = today.weekday()  # 0=Monday, 6=Sunday
    
    # Find availability rule for today
    today_rule = None
    for rule in availability_rules:
        if rule.get("day_of_week") == day_of_week and rule.get("enabled"):
            today_rule = rule
            break
    
    # If no rule found or day is disabled, return empty list
    if not today_rule:
        return []
    
    # Get time window from rule
    start_time = today_rule.get("start_time", "09:00")
    end_time = today_rule.get("end_time", "18:00")
    start_hour = parse_time(start_time) // 60
    end_hour = parse_time(end_time) // 60
    
    # Generate all possible slots within availability window
    all_slots = get_time_slots(start_hour, end_hour)
    available_slots = []
    
    # Filter by feasibility
    for slot in all_slots:
        feasibility = check_agent_slot_feasibility(
            agent_id=agent_id,
            time=slot,
            property_id=property_id,
            property_postcode=property_postcode,
            confirmed_viewings=confirmed_viewings,
            properties_db=properties_db
        )
        
        if feasibility.get("feasible"):
            available_slots.append(slot)
    
    return available_slots

