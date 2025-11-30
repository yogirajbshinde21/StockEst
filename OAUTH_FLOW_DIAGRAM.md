# 🔐 OAuth Flow & Architecture Diagrams

## OAuth 2.0 Flow - Automatic Token Management

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ONE-TIME SETUP (Day 1)                           │
└─────────────────────────────────────────────────────────────────────┘

    User                 Your App              Upstox              Database
      │                     │                    │                    │
      │  1. Visit          │                    │                    │
      │  /api/upstox/      │                    │                    │
      │  authorize         │                    │                    │
      ├──────────────────→ │                    │                    │
      │                    │                    │                    │
      │  2. Return auth    │                    │                    │
      │  URL               │                    │                    │
      │ ←──────────────────┤                    │                    │
      │                    │                    │                    │
      │  3. Visit auth URL │                    │                    │
      │    (Upstox login)  │                    │                    │
      ├────────────────────┴────────────────────→                    │
      │                                          │                    │
      │  4. Login & Authorize                    │                    │
      ├─────────────────────────────────────────→                    │
      │                                          │                    │
      │  5. Redirect with                        │                    │
      │     auth code                            │                    │
      │ ←────────────────────────────────────────┤                    │
      │                    │                     │                    │
      │  6. /callback?     │                     │                    │
      │     code=XXX       │                     │                    │
      ├──────────────────→ │                     │                    │
      │                    │                     │                    │
      │                    │  7. Exchange code   │                    │
      │                    │     for tokens      │                    │
      │                    ├────────────────────→                     │
      │                    │                     │                    │
      │                    │  8. Return tokens   │                    │
      │                    │     - access_token  │                    │
      │                    │     - refresh_token │                    │
      │                    │     - expires_in    │                    │
      │                    │ ←───────────────────┤                    │
      │                    │                     │                    │
      │                    │  9. Save tokens     │                    │
      │                    ├────────────────────────────────────────→ │
      │                    │                     │         ✓ Saved    │
      │                    │ ←───────────────────────────────────────┤
      │                    │                     │                    │
      │  10. Success page  │                     │                    │
      │ ←──────────────────┤                     │                    │


┌─────────────────────────────────────────────────────────────────────┐
│              AUTOMATIC REFRESH (Every 12 hours)                     │
└─────────────────────────────────────────────────────────────────────┘

    Cron Job             Auth Service          Upstox              Database
      │                     │                    │                    │
      │  1. Every 12 hrs   │                    │                    │
      │  Check token       │                    │                    │
      ├──────────────────→ │                    │                    │
      │                    │                    │                    │
      │                    │  2. Load tokens    │                    │
      │                    ├────────────────────────────────────────→ │
      │                    │ ←───────────────────────────────────────┤
      │                    │                    │                    │
      │                    │  3. Check expiry   │                    │
      │                    │  (< 6 hrs left?)   │                    │
      │                    │                    │                    │
      │  4. If expiring    │                    │                    │
      │     soon           │  5. Refresh token  │                    │
      │                    │     request        │                    │
      │                    ├────────────────────→                    │
      │                    │                    │                    │
      │                    │  6. New tokens     │                    │
      │                    │ ←───────────────────                    │
      │                    │                    │                    │
      │                    │  7. Save new       │                    │
      │                    │     tokens         │                    │
      │                    ├────────────────────────────────────────→ │
      │                    │                    │         ✓          │
      │                    │                    │                    │
      │  8. Update stock   │                    │                    │
      │     service        │                    │                    │
      │ ←──────────────────┤                    │                    │
      │                    │                    │                    │


┌─────────────────────────────────────────────────────────────────────┐
│              STOCK PRICE UPDATE (Every 15 seconds)                  │
└─────────────────────────────────────────────────────────────────────┘

    Cron Job           Stock Service       Auth Service      Upstox API
      │                     │                    │                │
      │  1. Every 15 sec   │                    │                │
      │  (if market open)  │                    │                │
      ├──────────────────→ │                    │                │
      │                    │                    │                │
      │                    │  2. Get valid      │                │
      │                    │     token          │                │
      │                    ├────────────────────→                │
      │                    │                    │                │
      │                    │  3. Return token   │                │
      │                    │ ←───────────────────                │
      │                    │                    │                │
      │                    │  4. Fetch prices   │                │
      │                    ├────────────────────────────────────→
      │                    │                    │                │
      │                    │  5. Price data     │                │
      │                    │ ←───────────────────────────────────┤
      │                    │                    │                │
      │  6. Prices         │                    │                │
      │     updated        │                    │                │
      │ ←──────────────────┤                    │                │


```

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RENDER DEPLOYMENT                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Static Site)                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  React App (Built & Served)                                    │  │
│  │  - Portfolio Dashboard                                         │  │
│  │  - Stock Trading Interface                                     │  │
│  │  - Real-time Price Updates (Socket.io)                         │  │
│  │  - User Authentication                                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                    HTTPS (API Calls)                                │
│                              ↓                                       │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Web Service)                         │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Express.js Server                                             │  │
│  │  ├─ REST API Endpoints                                         │  │
│  │  ├─ Socket.io Server (Real-time)                               │  │
│  │  └─ Cron Jobs                                                  │  │
│  │      ├─ Stock Price Updates (Every 15s)                        │  │
│  │      ├─ Token Refresh Check (Every 12h)                        │  │
│  │      ├─ News Updates (Every 4h)                                │  │
│  │      └─ Historical Data Refresh (Daily 4PM)                    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│         ┌───────────────────┼───────────────────┐                   │
│         ↓                   ↓                   ↓                   │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────┐            │
│  │   MongoDB   │  │  Upstox Auth     │  │  External   │            │
│  │   Atlas     │  │  Service         │  │  APIs       │            │
│  │             │  │  - OAuth Flow    │  │  - Gemini   │            │
│  │  User Data  │  │  - Auto Refresh  │  │  - Perplex  │            │
│  │  Portfolios │  │  - Token Store   │  │             │            │
│  │  Stocks     │  └──────────────────┘  └─────────────┘            │
│  └─────────────┘           │                                        │
│                            ↓                                        │
│                   ┌──────────────────┐                              │
│                   │  Upstox API      │                              │
│                   │  - Market Data   │                              │
│                   │  - Live Prices   │                              │
│                   └──────────────────┘                              │
└──────────────────────────────────────────────────────────────────────┘
```

## Token Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                   TOKEN LIFECYCLE (24 hours)                 │
└──────────────────────────────────────────────────────────────┘

Hour 0   ─┐
          │  🔐 OAuth Authorization
          │  ✅ Token Created (expires in 24h)
          │  ✅ Refresh Token Stored
          │
Hour 6    │  ✅ Token Valid (18h remaining)
          │  
Hour 12   ─┤  🔍 Cron Check #1
          │  ✅ Still valid (12h remaining)
          │  ⏭️  No action needed
          │
Hour 18   ─┤  🔍 Cron Check #2
          │  ⚠️  Token expiring soon (< 6h)
          │  🔄 AUTO REFRESH triggered
          │  ✅ New token received
          │  💾 Saved to database
          │  ✅ Stock service updated
          │
Hour 24+  ─┤  ✅ Continuous operation
          │  🔄 Refresh before expiry
          │  ♾️  Repeat cycle


🔴 OLD WAY (Manual):
Hour 24   ─┤  ❌ Token expired
          │  🛑 App stops working
          │  👤 Manual intervention required
          │  🌐 Visit Upstox website
          │  📋 Copy new token
          │  ⚙️  Update .env
          │  🔄 Restart server

🟢 NEW WAY (Automatic):
Hour 24+  ─┤  ✅ Still working
          │  🔄 Auto-refreshed
          │  🚀 No downtime
          │  😴 No manual work
```

## File Structure for Token Storage

```
backend/
├── services/
│   ├── UpstoxAuthService.js      ← OAuth logic
│   └── stockDataService.js       ← Uses OAuth service
├── routes/
│   └── upstox.js                 ← OAuth endpoints
├── config/
│   └── upstox-token.json         ← Token storage (auto-created)
│       {
│         "accessToken": "eyJ...",
│         "refreshToken": "abc...",
│         "tokenExpiry": "2025-12-01T10:00:00.000Z",
│         "updatedAt": "2025-11-30T10:00:00.000Z"
│       }
└── server.js                     ← Includes cron job
```

## Environment Variables Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  ENVIRONMENT SETUP                          │
└─────────────────────────────────────────────────────────────┘

LOCAL DEVELOPMENT                   PRODUCTION (Render)
────────────────                    ──────────────────

.env file                          Render Dashboard
├── UPSTOX_API_KEY                 ├── UPSTOX_API_KEY
├── UPSTOX_API_SECRET              ├── UPSTOX_API_SECRET
├── UPSTOX_REDIRECT_URI            ├── UPSTOX_REDIRECT_URI
│   = http://localhost:5000/...    │   = https://your-app.onrender.com/...
├── MONGODB_URI                    ├── MONGODB_URI
│   = mongodb://localhost/...      │   = mongodb+srv://atlas/...
├── CORS_ORIGIN                    ├── CORS_ORIGIN
│   = http://localhost:3000        │   = https://your-frontend.onrender.com
└── NODE_ENV=development           └── NODE_ENV=production

         ↓                                    ↓
    
    process.env.*                       process.env.*
         ↓                                    ↓
    
  UpstoxAuthService                   UpstoxAuthService
         ↓                                    ↓
    
   OAuth Flow                          OAuth Flow
         ↓                                    ↓
    
  Token Stored in:                   Token Stored in:
  config/upstox-token.json           config/upstox-token.json
  (local file)                       (persistent disk)
```

## Key Differences: Before vs After

```
┌────────────────────────────────────────────────────────────────┐
│                    BEFORE (Manual)                             │
└────────────────────────────────────────────────────────────────┘

Day 1:  Login → Get token → Copy to .env → Deploy  ✅
Day 2:  Token expired → App broken → Repeat above  ❌
Day 3:  Token expired → App broken → Repeat above  ❌
Day N:  Same problem every day...                  😫


┌────────────────────────────────────────────────────────────────┐
│                     AFTER (Automatic)                          │
└────────────────────────────────────────────────────────────────┘

Day 1:  Deploy → Visit /authorize → Login once     ✅
Day 2:  Auto-refresh → App running                 ✅
Day 3:  Auto-refresh → App running                 ✅
Day N:  Always running, no intervention            🎉


┌────────────────────────────────────────────────────────────────┐
│                  TECHNICAL COMPARISON                          │
└────────────────────────────────────────────────────────────────┘

Aspect              BEFORE              AFTER
─────────────────   ─────────────────   ────────────────────
Token Lifespan      24 hours            Infinite (refreshed)
Manual Work         Daily               Once (initial setup)
Downtime            Daily               None
Server Restarts     Daily required      Never required
Scalability         Not viable          Production-ready
Maintenance         High effort         Zero effort
User Impact         Service disruption  Seamless experience
Cost                Time = ∞            Time = 0
```

## Security Considerations

```
┌────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                             │
└────────────────────────────────────────────────────────────────┘

1. ENVIRONMENT VARIABLES
   ├── Never in code
   ├── Never in Git
   ├── Render secure storage
   └── Different per environment

2. TOKEN STORAGE
   ├── File-based (server only)
   ├── Not in database
   ├── Not exposed via API
   └── Auto-managed lifecycle

3. OAUTH FLOW
   ├── Industry standard
   ├── Secure authorization
   ├── State parameter (CSRF protection)
   └── HTTPS only

4. API SECURITY
   ├── Rate limiting
   ├── CORS configured
   ├── Helmet.js headers
   └── JWT authentication

5. DATABASE
   ├── MongoDB Atlas managed
   ├── Network isolation
   ├── Encrypted connections
   └── User authentication
```

---

## Summary

**Problem Solved**: ✅ No more daily token updates

**How**: 
1. OAuth 2.0 authorization (one-time)
2. Automatic token refresh (every 12h check)
3. Seamless operation (24/7 uptime)

**User Experience**:
- Deploy once ✅
- Authorize once ✅
- Runs forever ✅

**Technical Benefits**:
- Production-ready
- Scalable architecture
- Zero maintenance
- Industry best practices

---
