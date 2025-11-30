# ✅ Pre-Deployment Checklist

Use this checklist to ensure you have everything ready before deploying to Render.

---

## 📋 Account Setup

### Required Accounts
- [ ] **GitHub account** - To store your code
- [ ] **Render account** - https://render.com (free)
- [ ] **MongoDB Atlas account** - https://www.mongodb.com/cloud/atlas (free)
- [ ] **Upstox Developer account** - https://developer.upstox.com/

### API Keys to Obtain
- [ ] **Perplexity API key** - https://docs.perplexity.ai/
- [ ] **Google Gemini API key** - https://aistudio.google.com/

---

## 🔧 MongoDB Atlas Setup

- [ ] Created free cluster
- [ ] Created database user (save username & password!)
- [ ] Configured network access (0.0.0.0/0 for Render)
- [ ] Obtained connection string
- [ ] Replaced `<password>` in connection string
- [ ] Added `/stockest` database name to connection string

**Your MongoDB URI should look like:**
```
mongodb+srv://username:password@cluster.mongodb.net/stockest?retryWrites=true&w=majority
```

---

## 🔑 Upstox API Setup

- [ ] Created Upstox Developer app
- [ ] Saved API Key (Client ID)
- [ ] Saved API Secret (Client Secret)
- [ ] Set initial redirect URL to: `http://localhost:5000/api/upstox/callback`
- [ ] (Will update after Render deployment)

---

## 💻 Local Code Preparation

### Files to Update
- [ ] **backend/.env** - Created from .env.example
- [ ] **frontend/.env** - Created from .env.example
- [ ] All secrets generated (JWT_SECRET, SESSION_SECRET)

### Git Repository
- [ ] All changes committed to Git
- [ ] Pushed to GitHub (main branch)
- [ ] Repository is accessible (public or Render has access)

---

## 🌐 Render Backend Preparation

### Environment Variables Ready
Prepare these values (you'll paste them in Render):

```bash
# Copy this template and fill in your actual values

NODE_ENV=production
PORT=5000

MONGODB_URI=mongodb+srv://...
# ↑ Your MongoDB Atlas connection string

JWT_SECRET=
# ↑ Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

SESSION_SECRET=
# ↑ Generate another random string

UPSTOX_API_KEY=
# ↑ From Upstox Developer Console

UPSTOX_API_SECRET=
# ↑ From Upstox Developer Console

UPSTOX_REDIRECT_URI=https://YOUR-BACKEND-NAME.onrender.com/api/upstox/callback
# ↑ You'll update this after creating the Render service

PERPLEXITY_API_KEY=
# ↑ Your Perplexity API key

GEMINI_API_KEY=
# ↑ Your Google Gemini API key

CORS_ORIGIN=https://YOUR-FRONTEND-NAME.onrender.com
# ↑ You'll update this after creating frontend service
```

**Checklist:**
- [ ] MongoDB URI ready
- [ ] JWT_SECRET generated (64+ characters)
- [ ] SESSION_SECRET generated
- [ ] Upstox API Key ready
- [ ] Upstox API Secret ready
- [ ] Perplexity API key ready
- [ ] Gemini API key ready

---

## 🎨 Render Frontend Preparation

### Environment Variables Ready
```bash
REACT_APP_API_BASE_URL=https://YOUR-BACKEND-NAME.onrender.com
REACT_APP_SOCKET_URL=https://YOUR-BACKEND-NAME.onrender.com
REACT_APP_NODE_ENV=production
```

**Checklist:**
- [ ] Know your planned backend service name
- [ ] Ready to update after backend deployment

---

## 📝 Information to Save

Create a secure note with all this information:

```
DEPLOYMENT INFO - STOCKEST
==========================

GitHub Repository:
URL: https://github.com/YOUR-USERNAME/YOUR-REPO
Branch: main

MongoDB Atlas:
Connection String: mongodb+srv://...
Username: 
Password: 
Database Name: stockest

Upstox API:
API Key: 
API Secret: 
Developer Console: https://developer.upstox.com/

Other APIs:
Perplexity Key: 
Gemini Key: 

Generated Secrets:
JWT_SECRET: 
SESSION_SECRET: 

Render Services (fill after creation):
Backend URL: 
Frontend URL: 
```

**Checklist:**
- [ ] All credentials saved securely
- [ ] Passwords not shared in screenshots
- [ ] Backup of all keys/secrets

---

## 🚀 Deployment Day Checklist

### Before You Start
- [ ] All prerequisites completed above
- [ ] Have 30-45 minutes of uninterrupted time
- [ ] Coffee/tea ready ☕
- [ ] Opened documentation: [QUICK_START_RENDER.md](./QUICK_START_RENDER.md)

### During Deployment
- [ ] Backend service created on Render
- [ ] All backend env vars added
- [ ] Backend deployed successfully (check logs)
- [ ] Backend health check: `https://your-backend.onrender.com/health`
- [ ] Frontend service created on Render
- [ ] All frontend env vars added
- [ ] Frontend deployed successfully
- [ ] Frontend loads: `https://your-frontend.onrender.com`
- [ ] Updated CORS_ORIGIN in backend
- [ ] Updated UPSTOX_REDIRECT_URI in backend
- [ ] Updated Upstox redirect URL in Developer Console
- [ ] Completed OAuth authorization
- [ ] Token status shows authorized: `/api/upstox/status`

### After Deployment
- [ ] User registration works
- [ ] User login works
- [ ] Stock data loads
- [ ] Real-time updates work (open in 2 tabs)
- [ ] Buy/sell transactions work
- [ ] Portfolio displays correctly
- [ ] No critical errors in Render logs

---

## 🔍 Final Verification

### Test All Features
- [ ] Health endpoint: `GET /health` returns 200
- [ ] Token endpoint: `GET /api/upstox/status` shows authorized
- [ ] Stock endpoint: `GET /api/stocks` returns data (after login)
- [ ] Frontend loads without console errors
- [ ] Register new user
- [ ] Login with credentials
- [ ] View stock list
- [ ] Buy a stock
- [ ] Check portfolio
- [ ] Sell a stock
- [ ] View transaction history
- [ ] Test on mobile browser
- [ ] Test real-time updates (2 browser windows)

### Monitor for 24 Hours
- [ ] Check logs after 1 hour
- [ ] Check logs after 6 hours
- [ ] Check logs after 12 hours (should see token check)
- [ ] Check logs after 24 hours (should see refresh if needed)
- [ ] No critical errors
- [ ] Token still authorized

---

## 🎯 Success Criteria

Your deployment is successful when:

✅ **Accessibility**
- Backend health check returns 200
- Frontend loads in browser
- No CORS errors in console

✅ **Authentication**
- Users can register
- Users can login
- JWT tokens work

✅ **Trading**
- Stock data loads
- Can buy stocks
- Can sell stocks
- Portfolio updates correctly

✅ **Real-time**
- Socket.io connects
- Prices update automatically
- Multiple clients receive updates

✅ **Token Management**
- Token status shows authorized
- Auto-refresh works (check logs after 12-24 hours)
- No manual intervention needed

✅ **Stability**
- No critical errors in logs
- App runs continuously
- Database connections stable

---

## 📞 Getting Help

If you get stuck at any step:

1. **Check the guides:**
   - [Quick Start](./QUICK_START_RENDER.md)
   - [Complete Guide](./RENDER_DEPLOYMENT_GUIDE.md)
   - [Deployment Summary](./DEPLOYMENT_SUMMARY.md)

2. **Check logs:**
   - Render Dashboard → Service → Logs
   - Browser Console (F12)

3. **Common issues:**
   - See "Troubleshooting" section in deployment guide

4. **Still stuck?**
   - Render Community: https://community.render.com
   - Check Render status: https://status.render.com

---

## 🎉 Post-Deployment

After successful deployment:

### Immediate
- [ ] Share app URL with test users
- [ ] Set up uptime monitoring (optional)
- [ ] Add URLs to documentation
- [ ] Celebrate! 🎉

### Week 1
- [ ] Monitor daily
- [ ] Verify token auto-refresh works
- [ ] Gather user feedback
- [ ] Fix any issues

### Ongoing
- [ ] Check logs weekly
- [ ] Monitor database size
- [ ] Update dependencies monthly
- [ ] Consider upgrading to paid tier if traffic grows

---

## 💡 Pro Tips

1. **Save Everything**: Keep all credentials in a password manager
2. **Test Locally First**: Ensure everything works locally before deploying
3. **One Step at a Time**: Don't skip steps in the deployment guide
4. **Read Logs**: Most issues are visible in Render logs
5. **Start Free**: Use free tier for testing, upgrade later
6. **Monitor Token**: Check `/api/upstox/status` periodically
7. **Backup Env Vars**: Save all environment variables securely
8. **Document URLs**: Keep track of all your service URLs

---

## 🔄 If You Need to Redeploy

### Starting Fresh
If something goes wrong and you need to start over:

1. **Delete Render services** (keep database)
2. **Review this checklist** again
3. **Follow deployment guide** step by step
4. **Don't skip OAuth authorization**

### Updating Code
For code updates after initial deployment:

1. **Push to GitHub**
2. **Render auto-deploys** (if enabled)
3. **Or manually deploy** from Render dashboard
4. **Check logs** for any errors

---

## ✅ You're Ready!

If you've checked off all items above, you're ready to deploy!

**Next Step**: Follow [QUICK_START_RENDER.md](./QUICK_START_RENDER.md)

Good luck! 🚀
