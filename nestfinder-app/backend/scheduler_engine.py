"""
Scheduler Engine - Applies all availability constraints in correct order.

Constraint Application Order:
1. Weekly template (enabled days, time windows)
2. Blockouts (specific unavailable times/days)
3. Conflicts with confirmed viewings (duration + travel buffer)
4. Travel-time feasibility (travel optimization)
"""

from typing import List, Dict, Optional
from datetime import datetime, date
try:
    from . import travel_time
except ImportError:
    import travel_time


def parse_time(time_str: str) -> int:
    """Parse time string (HH:MM) to minutes since midnight."""
    parts = time_str.split(':')
    return int(parts[0]) * 60 + int(parts[1])


def format_time(minutes: int) -> str:
    """Format minutes since midnight to HH:MM string."""
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"


def get_time_slots(start_hour: int = 9, end_hour: int = 18) -> List[str]:
    """Generate time slots between start and end hours (30-minute intervals)."""
    slots = []
    for hour in range(start_hour, end_hour):
        slots.append(format_time(hour * 60))
        slots.append(format_time(hour * 60 + 30))
    return slots


def get_weekly_template(agency_id: int, availability_db: Dict) -> List[Dict]:
    """Get weekly availability template for agency."""
    return availability_db.get(agency_id, [])


def get_blockouts_for_date(agency_id: int, target_date: date, blockouts_db: Dict) -> List[Dict]:
    """Get all blockouts for a specific date."""
    date_str = str(target_date)
    blockouts = blockouts_db.get(agency_id, [])
    return [b for b in blockouts if b.get("date") == date_str]


def get_confirmed_viewings_for_date(agency_id: int, target_date: date, viewings_db: Dict, properties_db: Dict) -> List[Dict]:
    """Get confirmed viewings for a specific date."""
    # For MVP, we'll use confirmed viewings and assume they're for today if no date field exists
    # In production, this would filter by actual viewing date
    confirmed = [
        v for v in viewings_db.values()
        if v.get("status") == "confirmed"
    ]
    
    # Enrich with property info
    enriched = []
    for viewing in confirmed:
        property_id = viewing.get("property_id")
        if property_id and property_id in properties_db:
            property_data = properties_db[property_id]
            enriched.append({
                **viewing,
                "property": property_data,
                "property_postcode": property_data.get("postcode", "")
            })
    return enriched


def is_time_within_blockout(time_str: str, blockouts: List[Dict]) -> bool:
    """Check if a time slot falls within any blockout."""
    time_minutes = parse_time(time_str)
    
    for blockout in blockouts:
        if blockout.get("full_day"):
            return True  # Full day blockout
        
        start_time = blockout.get("start_time")
        end_time = blockout.get("end_time")
        
        if start_time and end_time:
            start_minutes = parse_time(start_time)
            end_minutes = parse_time(end_time)
            
            # Check if time falls within the blockout range
            # For a 30-min slot starting at time_str, check if it overlaps
            if time_minutes >= start_minutes and time_minutes < end_minutes:
                return True
            # Also check if slot overlaps (slot is 30 min, so check if slot end is within blockout)
            if time_minutes + 30 > start_minutes and time_minutes < end_minutes:
                return True
    
    return False


def is_time_conflicting_with_viewing(
    time_str: str,
    confirmed_viewings: List[Dict],
    viewing_duration: int = 20,
    travel_buffer: int = 10
) -> bool:
    """Check if a time slot conflicts with confirmed viewings."""
    time_minutes = parse_time(time_str)
    slot_end = time_minutes + viewing_duration
    
    for viewing in confirmed_viewings:
        viewing_time = viewing.get("confirmed_time") or viewing.get("requested_time")
        if not viewing_time:
            continue
        
        viewing_start = parse_time(viewing_time)
        viewing_end = viewing_start + viewing_duration
        
        # Check for overlap (with travel buffer)
        # New slot conflicts if it starts within travel_buffer of existing viewing end
        # or if existing viewing starts within travel_buffer of new slot end
        if (time_minutes < viewing_end + travel_buffer and slot_end + travel_buffer > viewing_start):
            return True
    
    return False


def calculate_travel_feasibility(
    time_str: str,
    property_id: int,
    property_postcode: str,
    confirmed_viewings: List[Dict],
    properties_db: Dict,
    agent_id: int = 1
) -> Dict:
    """
    Calculate travel feasibility for a slot.
    Returns: {"status": "ok"|"tight"|"conflict", "travel_minutes": int}
    """
    # Use existing travel_time logic
    feasibility = travel_time.check_agent_slot_feasibility(
        agent_id=agent_id,
        time=time_str,
        property_id=property_id,
        property_postcode=property_postcode,
        confirmed_viewings=confirmed_viewings,
        properties_db=properties_db
    )
    
    if not feasibility.get("feasible"):
        return {
            "status": "conflict",
            "travel_minutes": None
        }
    
    # Check if it's "tight" (travel time > 20 minutes)
    # Find previous viewing
    prev_viewing = None
    for v in sorted(confirmed_viewings, key=lambda x: parse_time(x.get("confirmed_time") or x.get("requested_time", "00:00"))):
        viewing_time = v.get("confirmed_time") or v.get("requested_time", "00:00")
        if parse_time(viewing_time) < parse_time(time_str):
            prev_viewing = v
    
    if prev_viewing:
        prev_property = prev_viewing.get("property") or properties_db.get(prev_viewing.get("property_id"))
        if prev_property:
            travel_minutes = travel_time.get_base_travel_time(
                prev_property.get("postcode"),
                property_postcode
            )
            if travel_minutes > 20:
                return {
                    "status": "tight",
                    "travel_minutes": travel_minutes
                }
            return {
                "status": "ok",
                "travel_minutes": travel_minutes
            }
    
    return {
        "status": "ok",
        "travel_minutes": None
    }


def generate_slots(
    agency_id: int,
    property_id: int,
    property_postcode: str,
    target_date: date,
    availability_db: Dict,
    blockouts_db: Dict,
    viewings_db: Dict,
    properties_db: Dict,
    agent_id: int = 1,
    viewing_duration: int = 20,
    travel_buffer: int = 10
) -> List[Dict]:
    """
    Generate available slots with all constraints applied in correct order.
    
    Returns list of slots with status:
    [
        {"time": "14:00", "status": "ok"},
        {"time": "15:00", "status": "tight", "travel_minutes": 22}
    ]
    """
    # STEP 1: Apply weekly template
    weekly_template = get_weekly_template(agency_id, availability_db)
    day_of_week = target_date.weekday()  # 0=Monday, 6=Sunday
    
    # Find rule for this day
    today_rule = None
    for rule in weekly_template:
        if rule.get("day_of_week") == day_of_week and rule.get("enabled"):
            today_rule = rule
            break
    
    # If day is disabled, return empty
    if not today_rule:
        return []
    
    # Generate baseline slots from weekly template
    start_time = today_rule.get("start_time", "09:00")
    end_time = today_rule.get("end_time", "18:00")
    start_hour = parse_time(start_time) // 60
    end_hour = parse_time(end_time) // 60
    
    baseline_slots = get_time_slots(start_hour, end_hour)
    
    # STEP 2: Remove blockouts
    blockouts = get_blockouts_for_date(agency_id, target_date, blockouts_db)
    
    # If full-day blockout exists, return empty
    if any(b.get("full_day") for b in blockouts):
        return []
    
    # Filter out slots within blockouts
    slots_after_blockouts = [
        slot for slot in baseline_slots
        if not is_time_within_blockout(slot, blockouts)
    ]
    
    # STEP 3: Remove conflicts with confirmed viewings
    confirmed_viewings = get_confirmed_viewings_for_date(
        agency_id, target_date, viewings_db, properties_db
    )
    
    slots_after_conflicts = [
        slot for slot in slots_after_blockouts
        if not is_time_conflicting_with_viewing(
            slot, confirmed_viewings, viewing_duration, travel_buffer
        )
    ]
    
    # STEP 4: Filter out past times if target_date is today
    from datetime import datetime
    today = datetime.now().date()
    now = datetime.now()
    current_time_minutes = now.hour * 60 + now.minute
    
    slots_after_time_filter = slots_after_conflicts
    if target_date == today:
        # Filter out slots that are in the past (with 30 min buffer)
        slots_after_time_filter = [
            slot for slot in slots_after_conflicts
            if parse_time(slot) > current_time_minutes + 30
        ]
    
    # STEP 5: Apply travel-time feasibility
    # Filter out conflicts, keep ok and tight
    final_slots = []
    for slot in slots_after_time_filter:
        feasibility = calculate_travel_feasibility(
            slot,
            property_id,
            property_postcode,
            confirmed_viewings,
            properties_db,
            agent_id
        )
        
        # Only include ok and tight slots (exclude conflicts)
        if feasibility["status"] != "conflict":
            slot_result = {
                "time": slot,
                "status": feasibility["status"]
            }
            if feasibility.get("travel_minutes"):
                slot_result["travel_minutes"] = feasibility["travel_minutes"]
            final_slots.append(slot_result)
    
    # STEP 6: Return only feasible + tight slots
    return final_slots

