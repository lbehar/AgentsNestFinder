# Setup Instructions

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- Supabase account (for database)

## Step 1: Frontend Setup

```bash
cd nestfinder-app
npm install
```

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Step 2: Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_random_secret
```

## Step 3: Database Setup

1. Create Supabase project at supabase.com
2. Go to SQL Editor
3. Run the SQL from `database/schema.sql`

## Step 4: Create PWA Icons

Create two icon files in `public/`:
- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels)

You can:
- Use a tool like https://realfavicongenerator.net/
- Or create simple colored squares with "NF" text
- Or use any icon generator

## Step 5: Run Development Servers

**Terminal 1 (Backend):**
```bash
cd backend
python main.py
```

**Terminal 2 (Frontend):**
```bash
cd nestfinder-app
npm run dev
```

## Step 6: Test

1. Open http://localhost:3000
2. Create an account
3. Complete agency setup
4. Add a property
5. Test viewing requests

## Production Deployment

See `DEPLOYMENT.md` for detailed deployment instructions.

