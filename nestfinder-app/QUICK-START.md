# Quick Start Guide - Testing NestFinder MVP

## Prerequisites
- Node.js 18+ and npm installed
- Python 3.10+ installed

## Step 1: Install Frontend Dependencies

```bash
cd nestfinder-app
npm install
```

## Step 2: Set Up Environment Variable (Optional)

Create `.env.local` in the `nestfinder-app` directory:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

(If you don't create this, it will default to `http://localhost:8000`)

## Step 3: Install Backend Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Step 4: Start the Backend Server

**In Terminal 1:**
```bash
cd nestfinder-app/backend
source venv/bin/activate  # If not already activated
python main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## Step 5: Start the Frontend Server

**In Terminal 2:**
```bash
cd nestfinder-app
npm run dev
```

You should see:
```
- ready started server on 0.0.0.0:3000
```

## Step 6: Test the Application

### 1. Open the App
- Navigate to: **http://localhost:3000**
- The app will redirect to `/dashboard`

### 2. Test the Flow

**A. Add a Property:**
- Go to "Properties" tab → Click "+ Add Property"
- Fill in property details:
  - Title: "Modern Flat in Paddington" (use same as SpareRoom/OpenRent)
  - Area: "Paddington" (required)
  - Address: "123 Main Street"
  - Postcode: "W2 4DX"
  - Cost (£): 1800 (optional)
  - Ad Property Link: "https://spareroom.co.uk/..." (optional)
- Click "Save Property"
- Property is automatically geocoded for travel optimization

**B. Get Master Booking Link:**
- Go to the "Properties" tab in the dashboard
- You'll see a "Master Booking Link" section at the top
- Copy the link (format: `http://localhost:3000/a/{agency-slug}`)
- This is the single link you share with all tenants

**C. Test Tenant Booking Flow:**
- Open the master booking link in a new tab/incognito window
- **Step 1**: Select a property from the dropdown (format: "Title – (Area) – £Cost")
- **Step 2**: Confirm property selection
  - See property details
  - Click "View original listing" if available
  - Click "Continue to Scheduling"
- **Step 3**: Select viewing date and time slot
  - Choose a date (defaults to today)
  - Select from available time slots
- **Step 4**: Fill in tenant information:
  - Name, Email, Phone (required)
  - Move-in Date, Occupants, Rent Budget (optional)
  - Message (optional)
- Submit the form
- You should see a confirmation screen

**D. View Request in Dashboard:**
- Go back to the dashboard (http://localhost:3000/dashboard)
- Switch to "Requests" view
- You should see the new viewing request with:
  - Property name
  - Requested time
  - Full Smart Profile (all tenant data)
- Test actions:
  - ✅ **Confirm** - Accepts the viewing
  - ⚙️ **Suggest** - Opens modal to suggest alternative time
  - ❌ **Decline** - Rejects the viewing

**E. View Schedule:**
- Switch to "Schedule" view
- Confirmed viewings should appear grouped by:
  - Today
  - Tomorrow
  - This Week

**F. Set Availability:**
- Go to "Availability" tab
- **Weekly Template**: Set recurring availability (Mon-Sun, start/end times)
- **Blocked Times**: Add specific date/time blockouts
- The system uses these rules + travel-time feasibility to filter slots

**G. Edit Properties:**
- Go to "Properties" tab
- Click "Edit" button on any property
- Update property details
- Changes are saved immediately

## Testing Travel-Time Feasibility

1. Add multiple properties with different postcodes
2. Confirm a viewing for one property at a specific time
3. Try to book another property close to that time
4. The system should filter out slots that don't allow enough travel time

## Troubleshooting

**Backend won't start:**
- Make sure Python virtual environment is activated
- Check if port 8000 is already in use
- Verify all dependencies are installed: `pip install -r requirements.txt`

**Frontend won't start:**
- Make sure you're in the `nestfinder-app` directory
- Check if port 3000 is already in use
- Verify dependencies: `npm install`

**API connection errors:**
- Verify backend is running on http://localhost:8000
- Check `.env.local` has correct API URL
- Check browser console for CORS errors

**No available slots:**
- Set availability rules (default is Mon-Sat 9-18)
- Check if it's Sunday (default closed)
- Verify no conflicting confirmed viewings

## Current Limitations (MVP)

- Uses in-memory storage (data resets on backend restart)
- Single default agent (agent_id: 1)
- Single default agency (agency_id: 1)
- No authentication required (for MVP testing)
- No email/SMS notifications

## Next Steps for Production

- Connect to Supabase database
- Add proper authentication
- Implement email/SMS notifications
- Add multi-agent support


