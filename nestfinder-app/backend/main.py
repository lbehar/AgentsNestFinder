from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import re
try:
    from . import travel_time
    from . import scheduler_engine
except ImportError:
    import travel_time
    import scheduler_engine

app = FastAPI(title="NestFinder API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (replace with Supabase in production)
# Using a single default agency for MVP
DEFAULT_AGENCY_ID = 1

agencies_db = {
    1: {
        "id": 1,
        "name": "My Agency",
        "slug": "myagency",
        "contact_email": "contact@agency.com",
        "contact_phone": None,
        "base_postcode": "W2 4DX",
        "default_duration": 20,
    }
}
properties_db = {}
viewings_db = {}
# Initialize default availability: All days enabled 09:00-18:00
# Agents can disable days as needed in the Availability tab
# day_of_week: 0=Monday, 1=Tuesday, ..., 6=Sunday
availability_db = {
    1: [
        {"day_of_week": 0, "enabled": True, "start_time": "09:00", "end_time": "18:00"},  # Monday
        {"day_of_week": 1, "enabled": True, "start_time": "09:00", "end_time": "18:00"},  # Tuesday
        {"day_of_week": 2, "enabled": True, "start_time": "09:00", "end_time": "18:00"},  # Wednesday
        {"day_of_week": 3, "enabled": True, "start_time": "09:00", "end_time": "18:00"},  # Thursday
        {"day_of_week": 4, "enabled": True, "start_time": "09:00", "end_time": "18:00"},  # Friday
        {"day_of_week": 5, "enabled": True, "start_time": "09:00", "end_time": "18:00"},  # Saturday
        {"day_of_week": 6, "enabled": True, "start_time": "09:00", "end_time": "18:00"},  # Sunday
    ]
}
# Blockouts: specific unavailable times/days
# Format: {agency_id: [{"id": 1, "date": "2025-11-18", "start_time": "12:00", "end_time": "14:00", "full_day": False}, ...]}
blockouts_db = {1: []}
blockout_id_counter = 1

# Pydantic models
class AgencyUpdate(BaseModel):
    agency_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    base_postcode: str
    default_duration: int

class PropertyCreate(BaseModel):
    title: str
    area: str
    address: str
    postcode: str
    rent: Optional[float] = None
    public_link: Optional[str] = None
    status: str = "active"

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    area: Optional[str] = None
    address: Optional[str] = None
    postcode: Optional[str] = None
    rent: Optional[float] = None
    public_link: Optional[str] = None
    status: Optional[str] = None

class ViewingCreate(BaseModel):
    tenant_name: str
    tenant_email: str
    tenant_phone: str
    property_id: int
    requested_time: str
    requested_date: Optional[date] = None
    move_in_date: Optional[date] = None
    occupants: Optional[int] = None
    rent_budget: Optional[float] = None
    message: Optional[str] = None

class ViewingUpdate(BaseModel):
    status: str
    suggested_time: Optional[str] = None

class AvailabilityRule(BaseModel):
    day_of_week: int  # 0=Monday, 1=Tuesday, ..., 6=Sunday
    enabled: bool
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format

class AvailabilityUpdate(BaseModel):
    availability: List[AvailabilityRule]

class BlockoutCreate(BaseModel):
    date: date
    start_time: Optional[str] = None  # HH:MM format, nullable if full_day
    end_time: Optional[str] = None    # HH:MM format, nullable if full_day
    full_day: bool = False

# Helper functions
def generate_slug(name: str) -> str:
    """Generate URL-friendly slug from name."""
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower())
    slug = slug.strip('-')
    return slug[:50] if len(slug) > 50 else slug

def ensure_unique_slug(base_slug: str, existing_slugs: set) -> str:
    """Ensure slug is unique by appending number if needed."""
    slug = base_slug
    counter = 1
    while slug in existing_slugs:
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug

def seed_demo_properties():
    """Seed demo properties for presentation if database is empty."""
    if len(properties_db) > 0:
        return  # Don't seed if properties already exist
    
    demo_properties = [
        {
            "title": "Modern Studio in Covent Garden",
            "area": "Covent Garden",
            "address": "45 Long Acre",
            "postcode": "WC2E 7BD",
            "rent": 1800.0,
            "public_link": "https://spareroom.co.uk/flatshare/london/covent_garden",
            "status": "active"
        },
        {
            "title": "Bright 1-Bed Flat in Soho",
            "area": "Soho",
            "address": "12 Greek Street",
            "postcode": "W1D 4HT",
            "rent": 2200.0,
            "public_link": "https://spareroom.co.uk/flatshare/london/soho",
            "status": "active"
        },
        {
            "title": "City Apartment near Bank",
            "area": "City of London",
            "address": "8 Threadneedle Street",
            "postcode": "EC2A 3AR",
            "rent": 2000.0,
            "public_link": "https://spareroom.co.uk/flatshare/london/city",
            "status": "active"
        },
        {
            "title": "Spacious Flat near Paddington Station",
            "area": "Paddington",
            "address": "23 Praed Street",
            "postcode": "W2 4DX",
            "rent": 1900.0,
            "public_link": "https://spareroom.co.uk/flatshare/london/paddington",
            "status": "active"
        },
        {
            "title": "Victorian House in Notting Hill",
            "area": "Notting Hill",
            "address": "15 Portobello Road",
            "postcode": "W11 2BQ",
            "rent": 2500.0,
            "public_link": "https://spareroom.co.uk/flatshare/london/notting_hill",
            "status": "active"
        },
        {
            "title": "Elegant Flat in Kensington",
            "area": "Kensington",
            "address": "42 Kensington High Street",
            "postcode": "W8 5AB",
            "rent": 2400.0,
            "public_link": "https://spareroom.co.uk/flatshare/london/kensington",
            "status": "active"
        },
        {
            "title": "Loft Apartment in Shoreditch",
            "area": "Shoreditch",
            "address": "18 Rivington Street",
            "postcode": "E1 6AN",
            "rent": 1700.0,
            "public_link": "https://spareroom.co.uk/flatshare/london/shoreditch",
            "status": "active"
        },
        {
            "title": "Modern Penthouse in Canary Wharf",
            "area": "Canary Wharf",
            "address": "25 Canada Square",
            "postcode": "E14 5AB",
            "rent": 2300.0,
            "public_link": "https://spareroom.co.uk/flatshare/london/canary_wharf",
            "status": "active"
        },
        {
            "title": "Family Home in Kingston",
            "area": "Kingston",
            "address": "12 High Street",
            "postcode": "KT1 1AE",
            "rent": 1500.0,
            "public_link": "https://spareroom.co.uk/flatshare/london/kingston",
            "status": "active"
        },
    ]
    
    agency = agencies_db.get(DEFAULT_AGENCY_ID, {})
    base_postcode = agency.get("base_postcode", "W2 4DX")
    
    for idx, prop_data in enumerate(demo_properties, start=1):
        # Generate unique slug
        base_slug = generate_slug(prop_data["title"])
        existing_slugs = {p.get("slug") for p in properties_db.values() if p.get("slug")}
        slug = ensure_unique_slug(base_slug, existing_slugs)
        
        # Geocode property coordinates
        latitude, longitude = travel_time.geocode_property(
            prop_data["address"],
            prop_data["postcode"],
            base_postcode
        )
        
        properties_db[idx] = {
            "id": idx,
            "title": prop_data["title"],
            "area": prop_data["area"],
            "address": prop_data["address"],
            "postcode": prop_data["postcode"],
            "rent": prop_data["rent"],
            "public_link": prop_data["public_link"],
            "status": prop_data["status"],
            "slug": slug,
            "latitude": latitude,
            "longitude": longitude,
            "agency_id": DEFAULT_AGENCY_ID,
            "source": "demo",
        }
    
    print(f"✅ Seeded {len(demo_properties)} demo properties")

# Agency routes
@app.get("/api/agency")
async def get_agency():
    return agencies_db.get(DEFAULT_AGENCY_ID, {
        "id": 1,
        "name": "My Agency",
        "slug": "myagency",
    })

@app.put("/api/agency")
async def update_agency(agency_data: AgencyUpdate):
    slug = generate_slug(agency_data.agency_name)
    
    agencies_db[DEFAULT_AGENCY_ID] = {
        "id": DEFAULT_AGENCY_ID,
        "name": agency_data.agency_name,
        "slug": slug,
        "contact_email": agency_data.contact_email,
        "contact_phone": agency_data.contact_phone,
        "base_postcode": agency_data.base_postcode,
        "default_duration": agency_data.default_duration,
    }
    
    return agencies_db[DEFAULT_AGENCY_ID]

# Properties routes
@app.get("/api/properties")
async def list_properties():
    agency_properties = [
        prop for prop in properties_db.values()
        if prop["agency_id"] == DEFAULT_AGENCY_ID
    ]
    return agency_properties

@app.post("/api/properties")
async def create_property(property_data: PropertyCreate):
    property_id = len(properties_db) + 1
    
    # Generate unique slug
    base_slug = generate_slug(property_data.title)
    existing_slugs = {p.get("slug") for p in properties_db.values() if p.get("slug")}
    slug = ensure_unique_slug(base_slug, existing_slugs)
    
    # Geocode property coordinates
    agency = agencies_db.get(DEFAULT_AGENCY_ID, {})
    base_postcode = agency.get("base_postcode")
    latitude, longitude = travel_time.geocode_property(
        property_data.address,
        property_data.postcode,
        base_postcode
    )
    
    properties_db[property_id] = {
        "id": property_id,
        "title": property_data.title,
        "area": property_data.area,
        "address": property_data.address,
        "postcode": property_data.postcode,
        "rent": property_data.rent,
        "public_link": property_data.public_link,
        "status": property_data.status,
        "slug": slug,
        "latitude": latitude,
        "longitude": longitude,
        "agency_id": DEFAULT_AGENCY_ID,
        "source": "manual",
    }
    
    return properties_db[property_id]

@app.get("/api/properties/by-id/{property_id}")
async def get_property_by_id(property_id: int):
    """Get property by ID for editing."""
    property = properties_db.get(property_id)
    if not property or property.get("agency_id") != DEFAULT_AGENCY_ID:
        raise HTTPException(status_code=404, detail="Property not found")
    return property

@app.get("/api/properties/{slug}")
async def get_property_by_slug(slug: str):
    """Get property by slug for tenant booking form."""
    for prop in properties_db.values():
        if prop.get("slug") == slug and prop.get("agency_id") == DEFAULT_AGENCY_ID:
            return prop
    raise HTTPException(status_code=404, detail="Property not found")

@app.put("/api/properties/{property_id}")
async def update_property(property_id: int, property_data: PropertyUpdate):
    """Update a property."""
    property = properties_db.get(property_id)
    if not property or property.get("agency_id") != DEFAULT_AGENCY_ID:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Update fields if provided
    if property_data.title is not None:
        property["title"] = property_data.title
        # Regenerate slug if title changed
        base_slug = generate_slug(property_data.title)
        existing_slugs = {p.get("slug") for p in properties_db.values() if p.get("slug") and p.get("id") != property_id}
        property["slug"] = ensure_unique_slug(base_slug, existing_slugs)
    
    if property_data.area is not None:
        property["area"] = property_data.area
    if property_data.address is not None:
        property["address"] = property_data.address
    if property_data.postcode is not None:
        property["postcode"] = property_data.postcode
        # Re-geocode if postcode changed
        agency = agencies_db.get(DEFAULT_AGENCY_ID, {})
        base_postcode = agency.get("base_postcode")
        latitude, longitude = travel_time.geocode_property(
            property.get("address", ""),
            property_data.postcode,
            base_postcode
        )
        property["latitude"] = latitude
        property["longitude"] = longitude
    if property_data.rent is not None:
        property["rent"] = property_data.rent
    if property_data.public_link is not None:
        property["public_link"] = property_data.public_link
    if property_data.status is not None:
        property["status"] = property_data.status
    
    return property

@app.get("/api/properties/{property_id}/available-slots")
async def get_available_slots(property_id: int, date: Optional[str] = None):
    """
    Get available time slots for a property with all constraints applied.
    
    Query params:
    - date: Optional date string (YYYY-MM-DD). Defaults to today.
    
    Returns slots with status (ok/tight) and travel_minutes:
    {
        "slots": [
            {"time": "14:00", "status": "ok"},
            {"time": "15:00", "status": "tight", "travel_minutes": 22}
        ]
    }
    """
    property = properties_db.get(property_id)
    if not property or property.get("agency_id") != DEFAULT_AGENCY_ID:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Parse date (default to today)
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        target_date = datetime.now().date()
    
    agent_id = 1  # Default agent for MVP
    property_postcode = property.get("postcode")
    
    # Use scheduler engine to generate slots with all constraints
    slots = scheduler_engine.generate_slots(
        agency_id=DEFAULT_AGENCY_ID,
        property_id=property_id,
        property_postcode=property_postcode,
        target_date=target_date,
        availability_db=availability_db,
        blockouts_db=blockouts_db,
        viewings_db=viewings_db,
        properties_db=properties_db,
        agent_id=agent_id,
        viewing_duration=20,  # Default viewing duration
        travel_buffer=10       # Travel buffer in minutes
    )
    
    return {"slots": slots}

@app.get("/api/viewings/{viewing_id}/feasibility")
async def get_viewing_feasibility(viewing_id: int):
    """Get feasibility status for a viewing request."""
    viewing = viewings_db.get(viewing_id)
    if not viewing:
        raise HTTPException(status_code=404, detail="Viewing not found")
    
    property = properties_db.get(viewing.get("property_id"))
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    agent_id = viewing.get("agent_id", 1)
    property_postcode = property.get("postcode")
    requested_time = viewing.get("requested_time")
    
    # Get confirmed viewings
    confirmed_viewings = [
        v for v in viewings_db.values()
        if v.get("status") == "confirmed" and v.get("agent_id") == agent_id
    ]
    
    # Check feasibility
    feasibility = travel_time.check_agent_slot_feasibility(
        agent_id=agent_id,
        time=requested_time,
        property_id=property.get("id"),
        property_postcode=property_postcode,
        confirmed_viewings=confirmed_viewings,
        properties_db=properties_db
    )
    
    if not feasibility.get("feasible"):
        return {
            "status": "conflict",
            "label": "Conflict",
            "color": "#f44336",
            "reason": feasibility.get("reason", "Not feasible")
        }
    
    # Check if it's tight (calculate travel time)
    # Find previous viewing
    prev_viewing = None
    for v in sorted(confirmed_viewings, key=lambda x: x.get("confirmed_time", x.get("requested_time", ""))):
        if (v.get("confirmed_time") or v.get("requested_time", "")) < requested_time:
            prev_viewing = v
    
    if prev_viewing:
        prev_property = properties_db.get(prev_viewing.get("property_id"))
        if prev_property:
            travel_time_min = travel_time.get_base_travel_time(
                prev_property.get("postcode"),
                property_postcode
            )
            # If travel time > 20 minutes, it's "tight"
            if travel_time_min > 20:
                return {
                    "status": "tight",
                    "label": "Tight",
                    "color": "#ff9800",
                    "travel_time": travel_time_min
                }
    
    return {
        "status": "ok",
        "label": "OK",
        "color": "#4caf50"
    }

# Viewings routes
@app.get("/api/viewings")
async def list_viewings():
    """Get all viewings for the agency, sorted by newest first."""
    agency_properties = [
        prop["id"] for prop in properties_db.values()
        if prop["agency_id"] == DEFAULT_AGENCY_ID
    ]
    
    viewings = [
        {
            **viewing,
            "property_title": properties_db.get(viewing["property_id"], {}).get("title", "Unknown"),
            "property_postcode": properties_db.get(viewing["property_id"], {}).get("postcode", ""),
            "tenant_name": viewing.get("tenant_name", "Unknown"),
        }
        for viewing in viewings_db.values()
        if viewing["property_id"] in agency_properties
    ]
    
    # Sort by newest first (created_at descending)
    viewings.sort(key=lambda v: v.get("created_at", ""), reverse=True)
    
    return viewings

@app.post("/api/viewings")
async def create_viewing(viewing_data: ViewingCreate):
    """Create a new viewing request with Smart Profile data."""
    # Verify property exists
    property = properties_db.get(viewing_data.property_id)
    if not property or property.get("agency_id") != DEFAULT_AGENCY_ID:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Validate that the requested date/time is not in the past
    if viewing_data.requested_date:
        requested_date = viewing_data.requested_date
        today = datetime.now().date()
        now = datetime.now()
        
        # Check if date is in the past
        if requested_date < today:
            raise HTTPException(
                status_code=400, 
                detail="Cannot book a viewing in the past. Please select a future date."
            )
        
        # If date is today, check if time is in the past
        if requested_date == today:
            # Parse requested time
            try:
                time_parts = viewing_data.requested_time.split(':')
                requested_hour = int(time_parts[0])
                requested_minute = int(time_parts[1])
                requested_time_minutes = requested_hour * 60 + requested_minute
                current_time_minutes = now.hour * 60 + now.minute
                
                # Reject if time is in the past (with 30 min buffer)
                if requested_time_minutes <= current_time_minutes + 30:
                    raise HTTPException(
                        status_code=400,
                        detail="Cannot book a viewing in the past. Please select a time at least 30 minutes in the future."
                    )
            except (ValueError, IndexError):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid time format. Use HH:MM format."
                )
    
    viewing_id = len(viewings_db) + 1
    viewings_db[viewing_id] = {
        "id": viewing_id,
        "tenant_name": viewing_data.tenant_name,
        "tenant_email": viewing_data.tenant_email,
        "tenant_phone": viewing_data.tenant_phone,
        "property_id": viewing_data.property_id,
        "requested_time": viewing_data.requested_time,
        "requested_date": viewing_data.requested_date.isoformat() if viewing_data.requested_date else None,
        "move_in_date": viewing_data.move_in_date.isoformat() if viewing_data.move_in_date else None,
        "occupants": viewing_data.occupants,
        "rent_budget": viewing_data.rent_budget,
        "message": viewing_data.message,
        "status": "pending",
        "agent_id": 1,  # Default agent
        "created_at": datetime.now().isoformat(),
    }
    
    return viewings_db[viewing_id]

@app.patch("/api/viewings/{viewing_id}")
async def update_viewing(
    viewing_id: int,
    update_data: ViewingUpdate
):
    """Update viewing status (confirmed/declined/pending) and optional suggested_time."""
    viewing = viewings_db.get(viewing_id)
    if not viewing:
        raise HTTPException(status_code=404, detail="Viewing not found")
    
    if update_data.status not in ["confirmed", "declined", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be confirmed, declined, or pending")
    
    viewing["status"] = update_data.status
    if update_data.suggested_time:
        viewing["suggested_time"] = update_data.suggested_time
    
    # If confirming, set confirmed_time to requested_time (or suggested_time if provided)
    if update_data.status == "confirmed":
        viewing["confirmed_time"] = update_data.suggested_time or viewing.get("requested_time")
    
    return viewing

# Availability routes
@app.get("/api/availability")
async def get_availability():
    """Get availability rules for the current agency."""
    rules = availability_db.get(DEFAULT_AGENCY_ID, [])
    # Ensure all 7 days are present
    if len(rules) < 7:
        # Initialize missing days
        existing_days = {r.get("day_of_week") for r in rules}
        for day in range(7):
            if day not in existing_days:
                rules.append({
                    "day_of_week": day,
                    "enabled": True,  # All days enabled by default
                    "start_time": "09:00",
                    "end_time": "18:00"
                })
        rules.sort(key=lambda x: x.get("day_of_week", 0))
        availability_db[DEFAULT_AGENCY_ID] = rules
    return rules

@app.put("/api/availability")
async def update_availability(data: AvailabilityUpdate):
    """Update availability rules for the current agency."""
    # Validate day_of_week values (0-6)
    for rule in data.availability:
        if rule.day_of_week < 0 or rule.day_of_week > 6:
            raise HTTPException(status_code=400, detail=f"Invalid day_of_week: {rule.day_of_week}. Must be 0-6.")
        # Validate time format
        import re
        if not re.match(r'^([0-1][0-9]|2[0-3]):[0-5][0-9]$', rule.start_time):
            raise HTTPException(status_code=400, detail=f"Invalid start_time format: {rule.start_time}. Must be HH:MM.")
        if not re.match(r'^([0-1][0-9]|2[0-3]):[0-5][0-9]$', rule.end_time):
            raise HTTPException(status_code=400, detail=f"Invalid end_time format: {rule.end_time}. Must be HH:MM.")
    
    # Convert Pydantic models to dicts
    try:
        # Pydantic v2
        availability_db[DEFAULT_AGENCY_ID] = [rule.model_dump() for rule in data.availability]
    except AttributeError:
        # Pydantic v1 fallback
        availability_db[DEFAULT_AGENCY_ID] = [rule.dict() for rule in data.availability]
    return {"status": "updated", "availability": availability_db[DEFAULT_AGENCY_ID]}

# Blockouts routes
@app.get("/api/blockouts")
async def get_blockouts():
    """Get all blockouts for the current agency."""
    return blockouts_db.get(DEFAULT_AGENCY_ID, [])

@app.post("/api/blockouts")
async def create_blockout(blockout_data: BlockoutCreate):
    """Create a new blockout."""
    global blockout_id_counter
    
    # Validate: if full_day, start_time and end_time should be None
    if blockout_data.full_day:
        if blockout_data.start_time or blockout_data.end_time:
            raise HTTPException(status_code=400, detail="start_time and end_time must be None for full-day blockouts")
    else:
        # Validate time format if not full_day
        if not blockout_data.start_time or not blockout_data.end_time:
            raise HTTPException(status_code=400, detail="start_time and end_time are required for time-range blockouts")
        import re
        if not re.match(r'^([0-1][0-9]|2[0-3]):[0-5][0-9]$', blockout_data.start_time):
            raise HTTPException(status_code=400, detail=f"Invalid start_time format: {blockout_data.start_time}. Must be HH:MM.")
        if not re.match(r'^([0-1][0-9]|2[0-3]):[0-5][0-9]$', blockout_data.end_time):
            raise HTTPException(status_code=400, detail=f"Invalid end_time format: {blockout_data.end_time}. Must be HH:MM.")
    
    blockout = {
        "id": blockout_id_counter,
        "date": str(blockout_data.date),
        "start_time": blockout_data.start_time,
        "end_time": blockout_data.end_time,
        "full_day": blockout_data.full_day,
    }
    
    if DEFAULT_AGENCY_ID not in blockouts_db:
        blockouts_db[DEFAULT_AGENCY_ID] = []
    blockouts_db[DEFAULT_AGENCY_ID].append(blockout)
    blockout_id_counter += 1
    
    return blockout

@app.delete("/api/blockouts/{blockout_id}")
async def delete_blockout(blockout_id: int):
    """Delete a blockout by ID."""
    if DEFAULT_AGENCY_ID not in blockouts_db:
        raise HTTPException(status_code=404, detail="Blockout not found")
    
    blockouts = blockouts_db[DEFAULT_AGENCY_ID]
    original_length = len(blockouts)
    blockouts_db[DEFAULT_AGENCY_ID] = [b for b in blockouts if b.get("id") != blockout_id]
    
    if len(blockouts_db[DEFAULT_AGENCY_ID]) == original_length:
        raise HTTPException(status_code=404, detail="Blockout not found")
    
    return {"status": "deleted"}

# Email ingestion stub
@app.post("/api/inbound-email")
async def inbound_email(payload: dict):
    """
    Placeholder for email ingestion from listings@nestfinder.uk
    Expected keys: sender, subject, body
    """
    print(f"Email received from {payload.get('sender')}: {payload.get('subject')}")
    print(f"Body: {payload.get('body')}")
    return {"status": "received", "message": "Email logged (processing not implemented)"}

@app.get("/api/agencies/{agency_slug}")
async def get_agency_by_slug(agency_slug: str):
    """Get agency by slug."""
    for agency in agencies_db.values():
        if agency.get("slug") == agency_slug:
            return agency
    raise HTTPException(status_code=404, detail="Agency not found")

@app.get("/api/agencies/{agency_slug}/properties")
async def get_agency_properties(agency_slug: str):
    """Get all active properties for an agency by slug."""
    agency = None
    for a in agencies_db.values():
        if a.get("slug") == agency_slug:
            agency = a
            break
    
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    agency_id = agency.get("id")
    active_properties = [
        prop for prop in properties_db.values()
        if prop.get("agency_id") == agency_id and prop.get("status") == "active"
    ]
    
    return active_properties

@app.get("/api/agencies/{agency_slug}/properties/{property_slug}")
async def get_public_property(agency_slug: str, property_slug: str):
    """Public endpoint for tenant booking link."""
    agency = agencies_db.get(DEFAULT_AGENCY_ID)
    if not agency or agency.get("slug") != agency_slug:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    for prop in properties_db.values():
        if prop.get("slug") == property_slug and prop.get("agency_id") == DEFAULT_AGENCY_ID:
            return prop
    
    raise HTTPException(status_code=404, detail="Property not found")

@app.get("/")
async def root():
    return {"message": "NestFinder API", "version": "1.0.0"}

@app.on_event("startup")
async def startup_event():
    """Seed demo properties on startup if database is empty."""
    seed_demo_properties()

if __name__ == "__main__":
    # Seed demo properties before starting server
    seed_demo_properties()
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
