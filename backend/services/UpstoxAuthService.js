const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');

/**
 * Upstox OAuth Service
 * Handles automatic token refresh to eliminate daily manual token updates
 */
class UpstoxAuthService {
  constructor() {
    this.apiKey = process.env.UPSTOX_API_KEY;
    this.apiSecret = process.env.UPSTOX_API_SECRET;
    this.redirectUri = process.env.UPSTOX_REDIRECT_URI || 'http://localhost:5000/api/upstox/callback';
    
    this.tokenFilePath = path.join(__dirname, '../config/upstox-token.json');
    
    this.baseUrl = 'https://api.upstox.com/v2';
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Initialize the service by loading saved tokens
   */
  async initialize() {
    try {
      await this.loadTokens();
      
      if (this.accessToken && this.tokenExpiry) {
        const now = new Date();
        const expiryDate = new Date(this.tokenExpiry);
        
        // If token expires in less than 1 hour, refresh it
        if (expiryDate - now < 60 * 60 * 1000) {
          console.log('⚠️ Token expiring soon, refreshing...');
          await this.refreshAccessToken();
        } else {
          console.log('✅ Loaded valid Upstox access token');
        }
      } else {
        console.log('⚠️ No valid token found. Authorization required.');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Upstox Auth:', error.message);
    }
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthorizationUrl() {
    const authUrl = `https://api.upstox.com/v2/login/authorization/dialog`;
    const params = new URLSearchParams({
      client_id: this.apiKey,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      state: this.generateState()
    });
    
    return `${authUrl}?${params.toString()}`;
  }

  /**
   * Generate random state for OAuth security
   */
  generateState() {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(authorizationCode) {
    try {
      console.log('🔄 Exchanging authorization code for access token...');
      
      const response = await axios.post(
        `${this.baseUrl}/login/authorization/token`,
        {
          code: authorizationCode,
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
        
        // Calculate token expiry (typically 24 hours)
        const expiresIn = response.data.expires_in || 86400; // Default 24 hours
        this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

        await this.saveTokens();
        console.log('✅ Access token obtained successfully');
        
        return {
          accessToken: this.accessToken,
          expiresAt: this.tokenExpiry
        };
      } else {
        throw new Error('Invalid response from token endpoint');
      }
    } catch (error) {
      console.error('❌ Failed to get access token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available. Re-authorization required.');
    }

    try {
      console.log('🔄 Refreshing access token...');
      
      const response = await axios.post(
        `${this.baseUrl}/login/authorization/token`,
        {
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        
        // Update refresh token if provided
        if (response.data.refresh_token) {
          this.refreshToken = response.data.refresh_token;
        }
        
        // Update expiry
        const expiresIn = response.data.expires_in || 86400;
        this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

        await this.saveTokens();
        console.log('✅ Access token refreshed successfully');
        
        return {
          accessToken: this.accessToken,
          expiresAt: this.tokenExpiry
        };
      } else {
        throw new Error('Invalid response from token refresh endpoint');
      }
    } catch (error) {
      console.error('❌ Failed to refresh token:', error.response?.data || error.message);
      
      // If refresh fails, we need re-authorization
      this.accessToken = null;
      this.refreshToken = null;
      this.tokenExpiry = null;
      
      throw new Error('Token refresh failed. Re-authorization required.');
    }
  }

  /**
   * Save tokens to file
   */
  async saveTokens() {
    try {
      const tokenData = {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        tokenExpiry: this.tokenExpiry,
        updatedAt: new Date().toISOString()
      };

      // Store in MongoDB instead of file system (Render has ephemeral filesystem)
      const TokenModel = mongoose.models.SystemToken || mongoose.model('SystemToken', new mongoose.Schema({
        service: { type: String, required: true, unique: true },
        accessToken: String,
        refreshToken: String,
        tokenExpiry: String,
        updatedAt: { type: Date, default: Date.now }
      }));

      await TokenModel.findOneAndUpdate(
        { service: 'upstox' },
        { ...tokenData, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      
      console.log('💾 Tokens saved successfully to MongoDB');
    } catch (error) {
      console.error('❌ Failed to save tokens:', error.message);
    }
  }

  /**
   * Load tokens from MongoDB
   */
  async loadTokens() {
    try {
      // Load from MongoDB instead of file system
      const TokenModel = mongoose.models.SystemToken || mongoose.model('SystemToken', new mongoose.Schema({
        service: { type: String, required: true, unique: true },
        accessToken: String,
        refreshToken: String,
        tokenExpiry: String,
        updatedAt: { type: Date, default: Date.now }
      }));

      const tokenDoc = await TokenModel.findOne({ service: 'upstox' });
      
      if (tokenDoc) {
        this.accessToken = tokenDoc.accessToken;
        this.refreshToken = tokenDoc.refreshToken;
        this.tokenExpiry = tokenDoc.tokenExpiry;
        
        console.log('📂 Tokens loaded from MongoDB');
      } else {
        console.log('📂 No saved tokens found in MongoDB');
      }
    } catch (error) {
      console.error('❌ Failed to load tokens:', error.message);
    }
  }

  /**
   * Get current valid access token (refresh if needed)
   */
  async getValidAccessToken() {
    // Check if we have a token
    if (!this.accessToken) {
      throw new Error('No access token available. Authorization required.');
    }

    // Check if token is about to expire (less than 5 minutes remaining)
    const now = new Date();
    const expiryDate = new Date(this.tokenExpiry);
    
    if (expiryDate - now < 5 * 60 * 1000) {
      console.log('⏰ Token expiring soon, refreshing...');
      await this.refreshAccessToken();
    }

    return this.accessToken;
  }

  /**
   * Check if we have valid credentials
   */
  isAuthorized() {
    return !!(this.accessToken && this.tokenExpiry && new Date(this.tokenExpiry) > new Date());
  }

  /**
   * Get token info for display
   */
  getTokenInfo() {
    if (!this.accessToken) {
      return {
        authorized: false,
        message: 'Not authorized'
      };
    }

    const now = new Date();
    const expiryDate = new Date(this.tokenExpiry);
    const hoursRemaining = Math.floor((expiryDate - now) / (1000 * 60 * 60));

    return {
      authorized: true,
      expiresAt: this.tokenExpiry,
      hoursRemaining: hoursRemaining,
      hasRefreshToken: !!this.refreshToken
    };
  }
}

// Create singleton instance
const upstoxAuthService = new UpstoxAuthService();

module.exports = upstoxAuthService;
