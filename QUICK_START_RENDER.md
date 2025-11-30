# 🚀 Quick Start: Deploy to Render in 30 Minutes

This is a streamlined guide to get your StockEst app live on Render quickly. For detailed explanations, see [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md).

---

## ⚡ 30-Minute Deployment Checklist

### Phase 1: Prerequisites (5 min)
- [ ] Create accounts:
  - Render.com
  - MongoDB Atlas
  - Upstox Developer
- [ ] Get API keys:
  - Perplexity API
  - Google Gemini API

### Phase 2: Database Setup (5 min)
1. **MongoDB Atlas**:
   - Create free cluster
   - Add database user (save password!)
   - Allow access from anywhere (0.0.0.0/0)
   - Copy connection string:
     ```
     mongodb+srv://user:password@cluster.mongodb.net/stockest?retryWrites=true&w=majority
     ```

### Phase 3: Upstox Setup (5 min)
1. **Upstox Developer Console**:
   - Create new app
   - Note API Key & API Secret
   - Set redirect URL to: `http://localhost:5000/api/upstox/callback` (update later)

### Phase 4: Deploy Backend (10 min)
1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy to Render"
   git push origin main
   ```

2. **Render - Create Web Service**:
   - Connect GitHub repo
   - Name: `stockest-backend`
   - Build: `cd backend && npm install`
   - Start: `cd backend && npm start`
   - Instance: Free

3. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=<your-mongodb-connection-string>
   JWT_SECRET=<generate-random-64-char-string>
   UPSTOX_API_KEY=<your-upstox-api-key>
   UPSTOX_API_SECRET=<your-upstox-api-secret>
   UPSTOX_REDIRECT_URI=https://YOUR-SERVICE.onrender.com/api/upstox/callback
   PERPLEXITY_API_KEY=<your-key>
   GEMINI_API_KEY=<your-key>
   SESSION_SECRET=<generate-random-string>
   ```

   Generate secrets:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

4. **Deploy** and note your backend URL

### Phase 5: Deploy Frontend (5 min)
1. **Render - Create Static Site**:
   - Same GitHub repo
   - Name: `stockest-frontend`
   - Root: `frontend`
   - Build: `npm install && npm run build`
   - Publish: `build`

2. **Environment Variables**:
   ```
   REACT_APP_API_BASE_URL=https://your-backend.onrender.com
   REACT_APP_SOCKET_URL=https://your-backend.onrender.com
   REACT_APP_NODE_ENV=production
   ```

3. **Deploy** and note frontend URL

### Phase 6: Update CORS & OAuth (3 min)
1. **Update Backend**:
   - Add env var: `CORS_ORIGIN=https://your-frontend.onrender.com`
   - Update `UPSTOX_REDIRECT_URI` with actual backend URL

2. **Update Upstox**:
   - Go to Upstox Developer Console
   - Update redirect URL to: `https://your-backend.onrender.com/api/upstox/callback`

### Phase 7: Authorize Upstox (2 min)
1. Visit: `https://your-backend.onrender.com/api/upstox/authorize`
2. Copy the `authUrl` from response
3. Visit that URL in browser
4. Login to Upstox and authorize
5. You'll be redirected back with success message

### Phase 8: Verify (1 min)
- [ ] Backend health: `https://your-backend.onrender.com/health` ✅
- [ ] Token status: `https://your-backend.onrender.com/api/upstox/status` ✅
- [ ] Frontend loads: `https://your-frontend.onrender.com` ✅
- [ ] Can register/login ✅
- [ ] Stock data shows ✅

---

## 🔑 Important URLs to Save

```
Backend:  https://YOUR-BACKEND-NAME.onrender.com
Frontend: https://YOUR-FRONTEND-NAME.onrender.com
Health:   https://YOUR-BACKEND-NAME.onrender.com/health
Token:    https://YOUR-BACKEND-NAME.onrender.com/api/upstox/status
```

---

## 🎯 What Happens Now?

✅ **Your app is live 24/7**
✅ **Upstox tokens refresh automatically every 12 hours**
✅ **No more daily manual updates needed**
✅ **MongoDB stores all user data**
✅ **Real-time stock updates via Socket.io**

---

## ⚠️ Common First-Time Issues

### 1. Backend takes 30+ seconds to respond
**Normal on free tier** - Service sleeps after 15 min inactivity.

**Solution**: Upgrade to paid tier ($7/month) or use UptimeRobot to ping every 10 min.

### 2. CORS error in browser
**Check**: `CORS_ORIGIN` in backend matches frontend URL exactly (no trailing slash).

### 3. Token status shows "not authorized"
**Action**: Complete OAuth flow at `/api/upstox/authorize` endpoint.

### 4. Database connection error
**Check**: MongoDB connection string is correct and password is URL-encoded.

### 5. Build failed
**Check Render logs** for specific error. Usually missing dependencies or syntax errors.

---

## 📊 Free Tier Limits

- **Backend**: Sleeps after 15 min (free), 750 hrs/month
- **Frontend**: Always on (static files)
- **MongoDB**: 512MB storage
- **Bandwidth**: 100GB/month

**Good for**: Testing, small user base (< 50 users)
**Upgrade when**: Need 99.9% uptime or > 100 daily active users

---

## 🔄 How Token Auto-Refresh Works

```
Every 12 hours:
  ↓
Check token expiry
  ↓
If < 6 hours remaining:
  ↓
Refresh token automatically
  ↓
Update stock service
  ↓
Continue running
```

**You'll see in logs**:
```
✅ Token still valid (18 hours remaining)
or
⚠️ Token expiring soon, refreshing...
✅ Token refreshed successfully
```

---

## 🆘 Quick Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| App not loading | Check Render logs for errors |
| CORS error | Update `CORS_ORIGIN` in backend |
| Stocks not updating | Verify token status at `/api/upstox/status` |
| Build failed | Check logs, verify package.json |
| Database error | Verify MongoDB connection string |
| Slow first load | Expected on free tier (service waking up) |

---

## 🎓 Next Steps

1. **Monitor for 24 hours** - Check logs for token refresh
2. **Set up monitoring** - UptimeRobot for uptime alerts
3. **Test all features** - Registration, trading, portfolio
4. **Share with users** - Get feedback
5. **Consider upgrade** - If traffic increases

---

## 📚 Resources

- **Full Guide**: [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)
- **Render Docs**: https://render.com/docs
- **MongoDB Atlas**: https://docs.atlas.mongodb.com
- **Upstox API**: https://upstox.com/developer/api-documentation

---

## ✅ Deployment Complete!

Your StockEst app is now:
- 🌐 Live and accessible worldwide
- 🔄 Auto-updating stock prices
- 🔐 Securely managing Upstox tokens
- 💾 Storing data in MongoDB
- 📱 Mobile responsive
- 🚀 Ready for users

**Frontend**: `https://your-app.onrender.com`

Happy Trading! 📈

---

**Issues?** See [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md) for detailed troubleshooting.
