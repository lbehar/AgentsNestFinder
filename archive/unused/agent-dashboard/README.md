# NestFinder Agent Dashboard

A lightweight React + Vite + TailwindCSS dashboard for real estate agents to manage properties and viewings.

## Features

- **Dashboard**: Summary cards showing active properties and pending viewings
- **Properties**: Add, edit, delete, and toggle status of properties
- **Viewings**: View and manage viewing requests from tenants (Confirm/Decline)
- **Share Link**: Generate and copy booking links for SpareRoom listings
- **localStorage Persistence**: All data saved locally in browser
- **Real-time Updates**: New tenant bookings appear automatically in dashboard

## Setup

```bash
cd agent-dashboard
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## How It Works

1. **Properties**: Stored in `localStorage` under key `nestfinder_properties`
2. **Viewings**: Stored in `localStorage` under key `nestfinder_viewings`
3. **Tenant Integration**: When tenants submit bookings via `tenant-booking.html`, they're automatically saved to localStorage and appear in the agent dashboard

## Tenant Form Connection

The tenant booking form (`../tenant-booking.html`) saves viewing requests to the same localStorage key that the dashboard reads from. This allows:

- Tenant submits booking → Saved to localStorage
- Agent dashboard detects change → New viewing appears in "Pending" section
- Agent can Confirm or Decline → Status updates in localStorage

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder, ready to deploy to Vercel or any static hosting.

