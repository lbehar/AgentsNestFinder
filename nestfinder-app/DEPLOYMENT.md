# Deployment Guide

## Frontend Deployment (Vercel)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to vercel.com
   - Import your GitHub repository
   - Set environment variable:
     - `NEXT_PUBLIC_API_URL` = your backend URL (e.g., `https://nestfinder-api.onrender.com`)

3. **Deploy**
   - Vercel will automatically deploy on push

## Backend Deployment (Render)

1. **Create New Web Service**
   - Go to render.com
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   - **Name**: nestfinder-api
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: `backend`

3. **Environment Variables**
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_KEY` = your Supabase anon key
   - `JWT_SECRET` = random secret string

4. **Deploy**
   - Render will build and deploy automatically

## Database Setup (Supabase)

1. **Create Project**
   - Go to supabase.com
   - Create new project
   - Note your project URL and anon key

2. **Run Schema**
   - Go to SQL Editor
   - Copy contents of `database/schema.sql`
   - Run the SQL

3. **Update Backend**
   - Replace in-memory storage with Supabase client
   - Use Supabase Python client library

## PWA Icons

Create icon files:
- `public/icon-192x192.png` (192x192px)
- `public/icon-512x512.png` (512x512px)

Use a tool like:
- https://realfavicongenerator.net/
- Or create simple colored squares with "NF" text

## Testing PWA

1. **Mobile Testing**
   - Deploy to production
   - Open on mobile device
   - Look for "Add to Home Screen" prompt
   - Test offline functionality

2. **Desktop Testing**
   - Open in Chrome
   - DevTools → Application → Service Workers
   - Check "Offline" checkbox
   - Test app functionality

