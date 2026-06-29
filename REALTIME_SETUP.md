# Real-Time Data Setup

## Current Behavior
The project uses seed data (22 demo issues) for testing. The backend API is **already real-time ready**.

## Switch to Real-Time (Option 1: Fresh Start)

1. **Delete the demo database:**
   ```bash
   cd backend
   rm community_hero.db
   ```

2. **Start the backend (it will create an empty database):**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

3. **Users can now create real issues through the app!**
   - Sign up as a citizen
   - Report real issues with GPS coordinates
   - Other users can vote and validate
   - Officials can assign and resolve

## Keep Demo Data for Testing (Option 2)

If you want to keep testing with demo data alongside real data:

1. **Keep the existing database** - it already supports real-time
2. **Users can add new issues** - they'll appear alongside demo data
3. **Filter by date** - recent issues are real, older ones are demo

## Environment Variables (.env)

For full real-time features, add these optional API keys:

```env
# AI Analysis (optional - falls back to mock if missing)
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_claude_key

# Google Maps (optional)
GOOGLE_MAPS_API_KEY=your_maps_key
```

Without API keys, the app works in **mock mode** - fully functional but with simulated AI responses.

## Real-Time Features Already Working

✅ **Create Issues** - POST /api/issues  
✅ **List Issues** - GET /api/issues  
✅ **Vote on Issues** - POST /api/issues/{id}/vote  
✅ **Real-time Updates** - WebSocket at /ws  
✅ **User Registration** - POST /api/auth/signup  
✅ **Geolocation** - GPS-based issue reporting  
✅ **Notifications** - Nearby issue alerts  
✅ **Leaderboard** - XP-based rankings  

## Testing Real-Time Flow

1. Open the frontend app
2. Sign up as a new citizen
3. Click "Report Issue"
4. Take a photo or upload one
5. Add location (GPS or manual)
6. Submit - it goes live immediately!
7. Other users see it on the map in real-time

## Database Schema

The database supports both demo and real data:
- **Issues** - reported, verified, assigned, resolved
- **Users** - citizens and officials with XP
- **Votes** - upvotes for verification
- **Notifications** - real-time alerts
