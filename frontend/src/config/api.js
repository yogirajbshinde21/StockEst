/**
 * API Configuration
 * Centralized API endpoint configuration
 */

// Base API URL from environment variables
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

// Socket URL from environment variables
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_ME: '/api/auth/me',
  AUTH_LOGOUT: '/api/auth/logout',
  
  // Stocks
  STOCKS_LIVE_PRICES: '/api/stocks/live-prices',
  STOCKS_SEARCH: '/api/stocks/search',
  STOCKS_DETAILS: '/api/stocks',
  
  // Watchlist
  WATCHLIST: '/api/watchlist',
  WATCHLIST_ADD: '/api/watchlist/add',
  WATCHLIST_REMOVE: (instrumentKey) => `/api/watchlist/remove/${instrumentKey}`,
  WATCHLIST_ALERT: (instrumentKey) => `/api/watchlist/alert/${instrumentKey}`,
  
  // Trading
  TRADING_BUY: '/api/trading/buy',
  TRADING_SELL: '/api/trading/sell',
  TRADING_PORTFOLIO: '/api/trading/portfolio',
  TRADING_HISTORY: '/api/trading/history',
  
  // Analytics
  ANALYTICS: '/api/analytics',
  ANALYTICS_SNAPSHOT: '/api/analytics/snapshot',
  
  // News
  NEWS: '/api/news',
  
  // Chatbot
  CHATBOT: '/api/chatbot',
  CHATBOT_TIPS: '/api/chatbot/tips',
  
  // Achievements
  ACHIEVEMENTS: '/api/achievements',
  ACHIEVEMENTS_USER: '/api/achievements/user'
};

export default {
  API_BASE_URL,
  SOCKET_URL,
  API_ENDPOINTS
};
