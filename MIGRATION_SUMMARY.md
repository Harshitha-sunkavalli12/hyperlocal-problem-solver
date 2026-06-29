# Converting from Demo Data to Real-Time

## ✅ What Changed

1. **Created `clear_demo_data.py`** - Simple script to delete demo database
2. **Updated `main.py`** - Shows startup message indicating data mode
3. **Created `REALTIME_SETUP.md`** - Complete guide for real-time setup
4. **Updated `README.md`** - Added both demo and real-time startup options

## 🚀 How to Switch to Real-Time

### Quick Method
```bash
cd backend
python clear_demo_data.py
python -m uvicorn app.main:app --reload
```

That's it! The database is now empty and ready for real users to report real issues.

## 📱 Real-Time Features (Already Working)

Your app **already supports real-time data**! These features work immediately:

- ✅ Users can sign up and log in
- ✅ Report issues with GPS coordinates
- ✅ Upload photos (camera or file)
- ✅ Vote on issues (crowd validation)
- ✅ Officials can assign and resolve issues
- ✅ Real-time WebSocket updates
- ✅ Leaderboard with XP tracking
- ✅ Nearby issue notifications
- ✅ AI analysis (with API keys) or mock mode (without)

## 🔑 Optional: Add API Keys for Full AI Features

Create `backend/.env`:
```env
GEMINI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
GOOGLE_MAPS_API_KEY=your_key_here
```

Without keys, the app works in **mock mode** - fully functional but with simulated AI responses.

## 📊 Data Flow

**Demo Mode** (current):
- 22 pre-populated issues
- Demo users with votes
- Good for testing UI/features

**Real-Time Mode** (after clearing):
- Empty database
- Real users sign up
- Real issues reported via app
- Real GPS coordinates
- Real photos
- Real voting and resolution

## 🎯 No Code Changes Needed!

The backend API was built for real-time from the start. The seed data was just for demonstration. All endpoints work with live data:

- `POST /api/issues` - Create real issues
- `GET /api/issues` - List all issues (real + demo if mixed)
- `POST /api/issues/{id}/vote` - Real voting
- `POST /api/auth/signup` - Real user registration
- `WebSocket /ws` - Real-time updates

Your app is production-ready! 🎉
