# NestFinder for Agents - MVP

A full-stack Progressive Web App for real estate agents to manage properties and tenant viewing requests with intelligent travel-time optimization.

## 🎯 Overview

NestFinder helps letting agents:
- **Receive viewing requests** from tenants via a single master booking link
- **View tenant Smart Profiles** with all submission data
- **Confirm, suggest, or decline** viewing requests
- **Manage properties** with area, postcode, and listing links
- **Set availability** with weekly templates and blockouts
- **Optimize schedules** using travel-time feasibility checks

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (React) + TypeScript + TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL) - *Currently using in-memory storage for MVP*
- **Hosting**: Vercel (frontend) + Render/Fly.io (backend)

## 🚀 Quick Start

See [QUICK-START.md](./QUICK-START.md) for detailed testing instructions.

### Frontend Setup

```bash
cd nestfinder-app
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

### Backend Setup

```bash
cd nestfinder-app/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs on `http://localhost:8000`

## ✨ Key Features

### Master Agent Link
- **Single booking link** per agent: `/a/{agencySlug}`
- Tenants select property from dropdown
- Format: `Title – (Area) – £Cost`
- Shows original listing link before scheduling

### Property Management
- Add properties with:
  - Title, Area, Address, Postcode
  - Cost (£)
  - Ad Property Link (SpareRoom/OpenRent URL)
- Edit existing properties
- Automatic geocoding for travel optimization

### Viewing Requests
- **Smart Profile Display**: Raw tenant data (name, email, phone, move-in date, occupants, rent budget, message)
- **Actions**: Confirm, Suggest alternative time, Decline
- **Feasibility Badges**: OK / Tight / Conflict indicators
- **Message Button**: Direct email link to tenant

### Availability System
- **Weekly Template**: Set recurring availability (Mon-Sun, start/end times)
- **Blockouts**: Block specific dates/times
- **Slot Generation**: Applies constraints in order:
  1. Weekly template
  2. Blockouts
  3. Confirmed viewing conflicts
  4. Travel-time feasibility

### Travel-Time Optimization
- Calculates travel time between properties using postcode coordinates
- Prevents impossible back-to-back viewings
- Shows "tight" slots (travel time > 20 min) with warnings
- Filters out conflicting slots automatically

### Schedule View
- Timeline of confirmed viewings
- Grouped by: Today, Tomorrow, This Week
- Shows availability windows and blockouts
- Visual travel path previews

## 📁 Project Structure

```
nestfinder-app/
├── app/                          # Next.js App Router
│   ├── a/[agentSlug]/           # Master agent booking link
│   ├── tenant/[property]/        # Direct property booking (legacy)
│   ├── dashboard/                # Agent dashboard
│   ├── add-property/            # Add property form
│   ├── edit-property/[id]/      # Edit property form
│   └── ...
├── components/                   # React components
│   ├── ViewingRequestsScreen.tsx
│   ├── ScheduleScreen.tsx
│   ├── PropertiesTab.tsx
│   ├── AvailabilityTab.tsx
│   └── ...
├── backend/                     # FastAPI backend
│   ├── main.py                  # API routes
│   ├── scheduler_engine.py      # Slot generation logic
│   ├── travel_time.py           # Travel optimization
│   └── requirements.txt
├── database/
│   └── schema.sql               # PostgreSQL schema
└── public/
    ├── manifest.json            # PWA manifest
    └── sw.js                    # Service worker
```

## 🔑 API Endpoints

### Agency
- `GET /api/agency` - Get agency info
- `PUT /api/agency` - Update/create agency
- `GET /api/agencies/{agency_slug}` - Get agency by slug
- `GET /api/agencies/{agency_slug}/properties` - Get active properties

### Properties
- `GET /api/properties` - List all properties
- `POST /api/properties` - Create property (with geocoding)
- `GET /api/properties/by-id/{id}` - Get property by ID
- `PUT /api/properties/{id}` - Update property
- `GET /api/properties/{slug}` - Get property by slug
- `GET /api/properties/{id}/available-slots` - Get available slots for date

### Viewings
- `GET /api/viewings` - List all viewings (newest first)
- `POST /api/viewings` - Create viewing request
- `PATCH /api/viewings/{id}` - Update viewing status
- `GET /api/viewings/{id}/feasibility` - Get feasibility status

### Availability
- `GET /api/availability` - Get weekly availability rules
- `PUT /api/availability` - Update availability rules

### Blockouts
- `GET /api/blockouts` - Get all blockouts
- `POST /api/blockouts` - Create blockout
- `DELETE /api/blockouts/{id}` - Delete blockout

## 📱 Mobile Experience

- **Responsive Design**: Works on all screen sizes
- **Hamburger Menu**: Mobile navigation for dashboard
- **PWA Support**: Installable on mobile devices
- **Touch-Optimized**: Large buttons, easy interactions

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

**Frontend (Vercel)**
1. Connect GitHub repository
2. Set `NEXT_PUBLIC_API_URL` environment variable
3. Deploy

**Backend (Render/Fly.io)**
1. Create new service
2. Build: `pip install -r requirements.txt`
3. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add Supabase environment variables

## 📚 Documentation

- **[QUICK-START.md](./QUICK-START.md)** - Detailed testing guide
- **[SETUP.md](./SETUP.md)** - Setup instructions
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guide
- **[backend/README.md](./backend/README.md)** - Backend API documentation

## 🧪 Current Status (MVP)

### ✅ Implemented
- Master agent booking link with property selection
- Property management (add, edit, list)
- Viewing request management
- Smart Profile display
- Weekly availability + blockouts
- Travel-time optimization
- Schedule view with timeline
- Mobile-responsive design
- PWA support

### ⚠️ MVP Limitations
- In-memory storage (data resets on restart)
- Single default agent/agency
- No authentication (for testing)
- No email/SMS notifications
- No calendar sync

### 🔜 Production Requirements
- Connect to Supabase database
- Implement proper authentication
- Add email/SMS notifications
- Multi-agent support
- Analytics dashboard

## 📝 Notes

- **Geocoding**: Uses postcode prefix lookup (no external API required)
- **Travel Time**: Calculated using Haversine formula with 30 km/h average speed
- **Slot Status**: `ok` (comfortable), `tight` (>20 min travel), `conflict` (not feasible)
- **Viewing Duration**: 20 minutes default
- **Travel Buffer**: 10 minutes between viewings

## 🤝 Contributing

This is an MVP. For production deployment, see the deployment guide and ensure:
1. Database connection to Supabase
2. Proper authentication implementation
3. Environment variables configured
4. PWA icons created
