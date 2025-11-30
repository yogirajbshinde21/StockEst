# 🚀 Complete Render Deployment Guide for StockEst

This comprehensive guide will help you deploy your StockEst application on Render with automatic Upstox token management, eliminating the need for daily manual token updates.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Understanding the Token Problem & Solution](#understanding-the-token-problem--solution)
3. [MongoDB Atlas Setup](#mongodb-atlas-setup)
4. [Upstox API Configuration](#upstox-api-configuration)
5. [Deploy Backend on Render](#deploy-backend-on-render)
6. [Deploy Frontend on Render](#deploy-frontend-on-render)
7. [OAuth Authorization Setup](#oauth-authorization-setup)
8. [Testing the Deployment](#testing-the-deployment)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- ✅ GitHub account (to connect with Render)
- ✅ Render account (sign up at https://render.com)
- ✅ MongoDB Atlas account (sign up at https://www.mongodb.com/cloud/atlas)
- ✅ Upstox Developer account (https://developer.upstox.com/)
- ✅ Perplexity API key (https://docs.perplexity.ai/)
- ✅ Google Gemini API key (https://aistudio.google.com/)

---

## Understanding the Token Problem & Solution

### 🔴 The Problem
Your current Upstox access token expires every 24 hours, requiring daily manual updates from the Upstox website.

### 🟢 The Solution
We've implemented **OAuth 2.0 with automatic token refresh** that:
- ✅ Authenticates once during initial setup
- ✅ Automatically refreshes tokens before expiration
- ✅ Stores tokens securely on the server
- ✅ Runs 24/7 without manual intervention

**How it works:**
1. You authorize the app once via OAuth (one-time setup)
2. Server receives access token + refresh token
3. Background job checks token status every 12 hours
4. Token auto-refreshes when needed (before expiration)
5. Your app runs continuously without interruption

---

## MongoDB Atlas Setup

### Step 1: Create a Free Cluster

1. Go to https://www.mongodb.com/cloud/atlas and sign in
2. Click **"Create"** → **"Shared"** (Free tier)
3. Choose:
   - **Provider**: AWS
   - **Region**: Choose closest to Oregon (where your Render app will be)
   - **Cluster Name**: `StockEstCluster`
4. Click **"Create Cluster"** (takes 3-5 minutes)

### Step 2: Configure Database Access

1. Click **"Database Access"** in left sidebar
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Username: `stockest_admin`
5. Password: Generate a strong password (save it securely!)
6. Database User Privileges: **"Read and write to any database"**
7. Click **"Add User"**

### Step 3: Configure Network Access

1. Click **"Network Access"** in left sidebar
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for Render)
4. Confirm with **"0.0.0.0/0"**
5. Click **"Confirm"**

⚠️ **Note**: For production, you can restrict to Render's IP ranges later for better security.

### Step 4: Get Connection String

1. Go back to **"Database"** → Click **"Connect"**
2. Choose **"Connect your application"**
3. Driver: **Node.js**, Version: **4.1 or later**
4. Copy the connection string, it looks like:
   ```
   mongodb+srv://stockest_admin:<password>@stockestcluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password
6. Add `/stockest` before the `?` to specify database name:
   ```
   mongodb+srv://stockest_admin:YOUR_PASSWORD@stockestcluster.xxxxx.mongodb.net/stockest?retryWrites=true&w=majority
   ```

✅ Save this connection string - you'll need it for Render!

---

## Upstox API Configuration

### Step 1: Create Upstox App

1. Go to https://developer.upstox.com/
2. Sign in with your Upstox account
3. Navigate to **"My Apps"** → **"Create App"**
4. Fill in the details:
   - **App Name**: `StockEst Simulator`
   - **App Type**: `Web Application`
   - **Redirect URL**: `https://YOUR-BACKEND-NAME.onrender.com/api/upstox/callback`
     - (You'll update this after creating the Render service)
     - For now, use: `http://localhost:5000/api/upstox/callback`

5. Click **"Create"**

### Step 2: Get API Credentials

After creating the app, you'll see:
- **API Key** (Client ID)
- **API Secret** (Client Secret)

✅ Save both of these - you'll need them for Render environment variables!

### Step 3: Update Redirect URL (After Render Deployment)

Once you deploy to Render and get your backend URL, come back here and update the redirect URL to:
```
https://your-actual-backend-name.onrender.com/api/upstox/callback
```

---

## Deploy Backend on Render

### Step 1: Push Code to GitHub

1. Make sure all your latest code is committed:
   ```bash
   git add .
   git commit -m "Add OAuth and Render deployment configuration"
   git push origin main
   ```

### Step 2: Create Backend Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository (authorize Render if needed)
4. Select your `StockEst` repository
5. Configure the service:

   **Basic Settings:**
   - **Name**: `stockest-backend` (or your choice)
   - **Region**: `Oregon (US West)`
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Runtime**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`

   **Instance Type:**
   - Choose **"Free"** (for testing, upgrade later if needed)

### Step 3: Configure Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add the following environment variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGODB_URI` | Your MongoDB Atlas connection string from earlier |
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `UPSTOX_API_KEY` | Your Upstox API Key |
| `UPSTOX_API_SECRET` | Your Upstox API Secret |
| `UPSTOX_REDIRECT_URI` | `https://YOUR-SERVICE-NAME.onrender.com/api/upstox/callback` |
| `PERPLEXITY_API_KEY` | Your Perplexity API key |
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `CORS_ORIGIN` | `https://YOUR-FRONTEND-NAME.onrender.com` (add after frontend deploy) |
| `SESSION_SECRET` | Generate another random string |

**To generate random secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Deploy Backend

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes for first deploy)
3. Once deployed, note your backend URL: `https://your-backend-name.onrender.com`

### Step 5: Verify Backend Health

Visit: `https://your-backend-name.onrender.com/health`

You should see:
```json
{
  "success": true,
  "message": "Stock Simulator API is running",
  "timestamp": "...",
  "version": "1.0.0",
  "environment": "production"
}
```

---

## Deploy Frontend on Render

### Step 1: Create Frontend Static Site

1. In Render Dashboard, click **"New +"** → **"Static Site"**
2. Select the same GitHub repository
3. Configure:

   **Basic Settings:**
   - **Name**: `stockest-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

### Step 2: Add Environment Variables

| Key | Value |
|-----|-------|
| `REACT_APP_API_BASE_URL` | `https://your-backend-name.onrender.com` |
| `REACT_APP_SOCKET_URL` | `https://your-backend-name.onrender.com` |
| `REACT_APP_NODE_ENV` | `production` |

### Step 3: Deploy Frontend

1. Click **"Create Static Site"**
2. Wait for build and deployment
3. Note your frontend URL: `https://your-frontend-name.onrender.com`

### Step 4: Update Backend CORS

1. Go back to your **Backend service** in Render
2. Update the `CORS_ORIGIN` environment variable:
   - Value: `https://your-frontend-name.onrender.com`
3. Save changes (this will trigger a redeploy)

---

## OAuth Authorization Setup

Now comes the most important part - setting up automatic token refresh!

### Step 1: Update Upstox Redirect URL

1. Go back to https://developer.upstox.com/
2. Open your app settings
3. Update **Redirect URL** to:
   ```
   https://your-backend-name.onrender.com/api/upstox/callback
   ```
4. Update the `UPSTOX_REDIRECT_URI` environment variable in Render backend service
5. Save and let it redeploy

### Step 2: Initial OAuth Authorization

1. Open your browser and visit:
   ```
   https://your-backend-name.onrender.com/api/upstox/authorize
   ```

2. You'll see a JSON response with an authorization URL like:
   ```json
   {
     "success": true,
     "authUrl": "https://api.upstox.com/v2/login/authorization/dialog?client_id=...",
     "message": "Visit this URL to authorize the application"
   }
   ```

3. **Copy the `authUrl`** and paste it in your browser

4. You'll be redirected to Upstox login page:
   - Log in with your Upstox credentials
   - Authorize the application
   - You'll be redirected back to your backend

5. You should see a success page:
   ```
   ✅ Authorization Successful!
   Your Upstox API access has been authorized and the token has been saved.
   ```

### Step 3: Verify Token Status

Visit: `https://your-backend-name.onrender.com/api/upstox/status`

You should see:
```json
{
  "success": true,
  "data": {
    "authorized": true,
    "expiresAt": "2025-12-01T...",
    "hoursRemaining": 23,
    "hasRefreshToken": true
  }
}
```

✅ **Congratulations!** Your token is now managed automatically!

---

## Testing the Deployment

### Test Backend Endpoints

1. **Health Check**:
   ```
   GET https://your-backend-name.onrender.com/health
   ```

2. **Stock Data** (requires login):
   ```
   GET https://your-backend-name.onrender.com/api/stocks
   ```

3. **Token Status**:
   ```
   GET https://your-backend-name.onrender.com/api/upstox/status
   ```

### Test Frontend

1. Visit: `https://your-frontend-name.onrender.com`
2. Register a new account
3. Login
4. Check if stock data is loading
5. Try buying/selling stocks
6. Check portfolio

### Test Real-time Updates

1. Open the app in two different browser tabs
2. Make a trade in one tab
3. Verify it updates in the other tab (Socket.io test)

---

## Monitoring & Maintenance

### Automatic Token Refresh

The system automatically checks token status every 12 hours and refreshes when needed. You can monitor this in Render logs:

1. Go to Render Dashboard → Your Backend Service
2. Click **"Logs"**
3. Look for messages like:
   ```
   ✅ Token still valid (18 hours remaining)
   ```
   or
   ```
   ⚠️ Token expiring soon, refreshing...
   ✅ Token refreshed successfully
   ```

### Manual Token Refresh (If Needed)

If you ever need to manually refresh the token:

```bash
curl -X POST https://your-backend-name.onrender.com/api/upstox/refresh
```

### Monitoring Logs

**Backend Logs:**
- Real-time stock updates
- Token refresh events
- Database connections
- API calls

**Frontend Logs:**
- Build logs
- Static file serving

**Set up log alerts** (optional):
1. Render Dashboard → Service → Alerts
2. Configure email notifications for errors

---

## Troubleshooting

### Issue 1: Token Not Refreshing

**Symptoms**: Token expired, app not working

**Solutions**:
1. Check backend logs for refresh errors
2. Verify `UPSTOX_API_SECRET` is correct
3. Re-authorize if refresh token is invalid:
   - Visit `/api/upstox/authorize` again
   - Complete OAuth flow

### Issue 2: CORS Errors

**Symptoms**: Frontend can't connect to backend

**Solutions**:
1. Verify `CORS_ORIGIN` in backend matches frontend URL exactly
2. Make sure both URLs use `https://` (no trailing slash)
3. Check browser console for exact error
4. Redeploy backend after changing CORS settings

### Issue 3: Database Connection Failed

**Symptoms**: "MongoDB connection failed" in logs

**Solutions**:
1. Verify MongoDB Atlas connection string is correct
2. Check if password contains special characters (URL encode them)
3. Verify Network Access allows 0.0.0.0/0
4. Check database user has correct permissions

### Issue 4: Render Service Sleeping (Free Tier)

**Symptoms**: First request takes 30+ seconds

**Solutions**:
1. **Expected behavior** on Render free tier
2. Service spins down after 15 minutes of inactivity
3. First request after sleep takes time to wake up
4. **Workaround**: Use a service like UptimeRobot to ping every 10 minutes
5. **Best solution**: Upgrade to paid tier ($7/month) for always-on

### Issue 5: Stock Prices Not Updating

**Symptoms**: Prices are stale or not changing

**Solutions**:
1. Check if market is open (9:15 AM - 3:30 PM IST)
2. Verify Upstox token is valid: `/api/upstox/status`
3. Check backend logs for API errors
4. Ensure cron jobs are running (check logs)

### Issue 6: Build Failures

**Backend Build Failed**:
```bash
# Check package.json syntax
# Verify all dependencies are in package.json
# Check backend logs for specific error
```

**Frontend Build Failed**:
```bash
# Check for TypeScript errors
# Verify environment variables are set
# Check for missing dependencies
```

### Issue 7: Environment Variables Not Working

**Solutions**:
1. Verify variable names match exactly (case-sensitive)
2. No quotes around values in Render UI
3. After adding/changing variables, service auto-redeploys
4. Check logs to verify variables are loaded

---

## Advanced Configuration

### Custom Domain Setup

1. Purchase a domain (e.g., from Namecheap, GoDaddy)
2. In Render:
   - Backend: Settings → Custom Domain → Add your backend subdomain
   - Frontend: Settings → Custom Domain → Add your domain
3. Update DNS records as instructed by Render
4. Update all environment variables with new URLs
5. Update Upstox redirect URL

### Scaling for Production

**When to upgrade from Free tier:**
- More than 50 concurrent users
- Need 99.9% uptime
- Want faster response times
- Service sleeping is affecting UX

**Recommended Paid Setup:**
- **Backend**: Starter ($7/month) - Always on, 512MB RAM
- **Database**: MongoDB Atlas M2 ($9/month) - Better performance
- **Frontend**: Static Site (Free is fine)

**Total cost**: ~$16/month for reliable production setup

### Backup Strategy

1. **Database Backups**:
   - MongoDB Atlas has automatic backups on paid tiers
   - Export data regularly: `mongodump --uri="your-connection-string"`

2. **Code Backups**:
   - GitHub is your backup (keep pushing changes)
   - Consider creating release tags

3. **Environment Variable Backup**:
   - Save all env vars in a secure password manager
   - Never commit `.env` to git

### Monitoring & Analytics

**Set up monitoring:**
1. **UptimeRobot**: Free uptime monitoring
2. **New Relic**: Application performance monitoring
3. **Sentry**: Error tracking (optional)

---

## Security Best Practices

### 1. Environment Variables
- ✅ Never commit `.env` files to Git
- ✅ Use strong, random secrets (64+ characters)
- ✅ Rotate secrets periodically
- ✅ Different secrets for dev/staging/prod

### 2. Database Security
- ✅ Use MongoDB Atlas (managed security)
- ✅ Enable IP whitelisting (after testing)
- ✅ Use strong database passwords
- ✅ Regular backups

### 3. API Security
- ✅ Keep API keys private
- ✅ Rotate Upstox tokens automatically (✅ Done!)
- ✅ Rate limiting enabled (✅ Already configured)
- ✅ CORS properly configured

### 4. Application Security
- ✅ HTTPS enforced (Render does this automatically)
- ✅ Helmet.js for security headers (✅ Configured)
- ✅ JWT tokens for authentication
- ✅ Password hashing with bcrypt

---

## Cost Breakdown

### Free Tier (Perfect for Testing)
- **Render Backend**: Free (sleeps after inactivity)
- **Render Frontend**: Free
- **MongoDB Atlas**: Free (512MB storage)
- **Total**: $0/month

**Limitations**:
- Backend sleeps after 15 min inactivity
- 750 hours/month free (enough for one always-on service)
- Slower build times

### Recommended Production Setup
- **Render Backend**: Starter $7/month
- **Render Frontend**: Free
- **MongoDB Atlas**: M2 $9/month
- **Domain**: ~$12/year
- **Total**: ~$17/month

---

## Maintenance Checklist

### Daily
- ✅ Check uptime (automated monitoring)
- ✅ Review error logs (if Sentry is set up)

### Weekly
- ✅ Check token status: `/api/upstox/status`
- ✅ Verify stock data is updating
- ✅ Test key user flows

### Monthly
- ✅ Review database size (MongoDB Atlas dashboard)
- ✅ Check Render usage (Dashboard → Usage)
- ✅ Update dependencies: `npm outdated`
- ✅ Review and rotate secrets (quarterly)

### As Needed
- ✅ Deploy new features
- ✅ Apply security patches
- ✅ Scale resources based on usage

---

## Success Checklist

Before going live, verify:

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] MongoDB Atlas connected
- [ ] Upstox OAuth authorized (token valid)
- [ ] CORS configured correctly
- [ ] Environment variables all set
- [ ] Health endpoint returns 200
- [ ] User registration works
- [ ] User login works
- [ ] Stock data loads
- [ ] Real-time updates work (Socket.io)
- [ ] Buy/Sell trades work
- [ ] Portfolio updates correctly
- [ ] Logs show no critical errors
- [ ] Token auto-refresh tested (check logs after 12+ hours)

---

## Getting Help

If you encounter issues:

1. **Check Render Logs**: Most issues show up here
2. **MongoDB Atlas Logs**: For database issues
3. **Browser Console**: For frontend errors
4. **Render Community**: https://community.render.com
5. **Upstox Support**: https://upstox.com/support

---

## Conclusion

🎉 **Congratulations!** You now have a fully deployed stock trading simulator running 24/7 with automatic token management!

**Key Achievements**:
- ✅ No more daily token updates
- ✅ Automatic token refresh
- ✅ 24/7 availability
- ✅ Free hosting (or low-cost production)
- ✅ Scalable architecture

**Next Steps**:
1. Test thoroughly
2. Monitor for a few days
3. Set up uptime monitoring
4. Consider upgrading to paid tier for production
5. Add more features!

**Your app URLs**:
- Frontend: `https://your-frontend-name.onrender.com`
- Backend: `https://your-backend-name.onrender.com`
- API Docs: `https://your-backend-name.onrender.com/health`

---

**Need help?** Create an issue in the repository with:
- Clear description of the problem
- Screenshots/logs
- Steps to reproduce
- What you've tried

Happy Trading! 📈🚀
