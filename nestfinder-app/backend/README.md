# NestFinder Backend API

FastAPI backend for NestFinder Agent App.

## Setup

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
python main.py
# Or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Environment Variables

Create `.env` file:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_secret_key
```

## Current Implementation

- Uses in-memory storage for MVP
- Replace with Supabase client for production
- JWT tokens stored in memory (use Redis in production)

## Production Notes

- Add rate limiting
- Implement proper JWT validation
- Add database connection pooling
- Set up logging
- Add error tracking (Sentry)

