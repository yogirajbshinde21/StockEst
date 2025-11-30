const express = require('express');
const upstoxAuthService = require('../services/UpstoxAuthService');

const router = express.Router();

/**
 * @route   GET /api/upstox/authorize
 * @desc    Get Upstox authorization URL
 * @access  Admin only (add your own authentication middleware)
 */
router.get('/authorize', (req, res) => {
  try {
    const authUrl = upstoxAuthService.getAuthorizationUrl();
    
    res.json({
      success: true,
      authUrl: authUrl,
      message: 'Visit this URL to authorize the application',
      instructions: 'After authorization, you will be redirected back with a code'
    });
  } catch (error) {
    console.error('❌ Authorization URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate authorization URL'
    });
  }
});

/**
 * @route   GET /api/upstox/callback
 * @desc    Handle OAuth callback from Upstox
 * @access  Public (OAuth callback)
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send(`
        <html>
          <head><title>Authorization Failed</title></head>
          <body style="font-family: Arial; padding: 50px; text-align: center;">
            <h1 style="color: red;">❌ Authorization Failed</h1>
            <p>No authorization code received.</p>
          </body>
        </html>
      `);
    }

    console.log('🔐 Received authorization code, exchanging for token...');
    const tokenData = await upstoxAuthService.getAccessToken(code);

    res.send(`
      <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 50px;
              margin: 0;
            }
            .container {
              background: white;
              border-radius: 10px;
              padding: 40px;
              max-width: 600px;
              margin: 0 auto;
              box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            h1 { color: #4CAF50; margin-top: 0; }
            .info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .token { word-break: break-all; font-family: monospace; font-size: 12px; }
            .success-icon { font-size: 64px; }
            .btn {
              background: #4CAF50;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              text-decoration: none;
              display: inline-block;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h1>Authorization Successful!</h1>
            <p>Your Upstox API access has been authorized and the token has been saved.</p>
            
            <div class="info">
              <strong>Token Info:</strong><br>
              Expires At: ${new Date(tokenData.expiresAt).toLocaleString()}<br>
              Status: Active ✓
            </div>
            
            <p><strong>What's Next?</strong></p>
            <ul style="text-align: left;">
              <li>Your token will be automatically refreshed before expiration</li>
              <li>You no longer need to manually update tokens daily</li>
              <li>The server will handle token refresh automatically</li>
            </ul>
            
            <a href="/" class="btn">Close this window</a>
          </div>
        </body>
      </html>
    `);

    console.log('✅ Authorization completed successfully');
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    res.status(500).send(`
      <html>
        <head><title>Authorization Error</title></head>
        <body style="font-family: Arial; padding: 50px; text-align: center;">
          <h1 style="color: red;">❌ Authorization Error</h1>
          <p>${error.message}</p>
          <p>Please try again or contact support.</p>
        </body>
      </html>
    `);
  }
});

/**
 * @route   POST /api/upstox/refresh
 * @desc    Manually refresh the access token
 * @access  Admin only
 */
router.post('/refresh', async (req, res) => {
  try {
    const tokenData = await upstoxAuthService.refreshAccessToken();
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        expiresAt: tokenData.expiresAt,
        tokenInfo: upstoxAuthService.getTokenInfo()
      }
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/upstox/status
 * @desc    Get current token status
 * @access  Admin only
 */
router.get('/status', (req, res) => {
  try {
    const tokenInfo = upstoxAuthService.getTokenInfo();
    
    res.json({
      success: true,
      data: tokenInfo
    });
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get token status'
    });
  }
});

module.exports = router;
