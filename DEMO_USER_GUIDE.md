# 🎯 Demo User Credentials

## Login Information

**Email:** `demo@stocksimulator.com`  
**Password:** `Demo123`

## Features

- ✅ Works in both **local** and **deployed** versions
- ✅ Automatically created on deployment
- ✅ Starting balance: **₹1,00,000**
- ✅ Full access to all features

## How It Works

### Automatic Creation (Render Deployment)

When you deploy to Render, the demo user is automatically created during the build process via the `postinstall` script in `backend/package.json`.

```json
"scripts": {
  "postinstall": "node createDemoUser.js"
}
```

This runs after `npm install` completes on Render, ensuring the demo user exists before the server starts.

### Manual Creation (Local Development)

If you need to create/reset the demo user locally:

```bash
cd backend
npm run create-demo-user
```

Or run directly:

```bash
cd backend
node createDemoUser.js
```

## Script Features

The `createDemoUser.js` script:
- ✅ Checks if demo user already exists
- ✅ Creates new user if doesn't exist
- ✅ Updates password if user exists (useful for resets)
- ✅ Resets balance to ₹1,00,000
- ✅ Works with both local MongoDB and MongoDB Atlas
- ✅ Uses environment variables for database connection

## Demo User Details

| Property | Value |
|----------|-------|
| Email | `demo@stocksimulator.com` |
| Password | `Demo123` |
| Name | Demo User |
| Starting Balance | ₹1,00,000 |
| Portfolio | Empty (can start trading) |
| Watchlist | Empty |
| Achievements | None initially |

## Testing the Demo User

### On Deployed Version (Render)

1. Go to: `https://stockest-frontend.onrender.com`
2. Click **Login**
3. Enter:
   - Email: `demo@stocksimulator.com`
   - Password: `Demo123`
4. Start trading! 🎉

### On Local Development

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm start`
3. Open: `http://localhost:3000`
4. Login with demo credentials
5. Start trading! 🎉

## Resetting Demo User

If the demo user's balance gets low or you want to reset:

### Local
```bash
cd backend
npm run create-demo-user
```

### Production (Render)
The easiest way is to redeploy the backend:
1. Go to Render Dashboard → Backend Service
2. Click **Manual Deploy** → **Clear build cache & deploy**
3. This will run the `postinstall` script and reset the demo user

## Security Notes

⚠️ **Important:**
- This is a **demo account** for testing purposes
- Password is intentionally simple for easy access
- Don't use this pattern for real user accounts in production
- Consider adding rate limiting for demo account if needed

## Customization

To change demo user details, edit `backend/createDemoUser.js`:

```javascript
const DEMO_USER = {
  email: 'demo@stocksimulator.com',  // Change email
  password: 'Demo123',                // Change password
  name: 'Demo User',                  // Change display name
  balance: 100000,                    // Change starting balance
  portfolio: []
};
```

Then run the script again to update.

---

**Demo user is ready! You can now login and start trading.** 📈🚀
