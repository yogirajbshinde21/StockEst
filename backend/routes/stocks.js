const express = require('express');
const stockDataService = require('../services/stockDataService');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/stocks/live-prices
 * @desc    Get all live stock prices
 * @access  Public
 */
router.get('/live-prices', async (req, res) => {
  try {
    const stocks = await stockDataService.getLatestPrices();
    const marketStatus = stockDataService.getMarketStatus();
    const isMarketOpen = stockDataService.isMarketOpen();

    res.json({
      success: true,
      data: {
        stocks,
        marketStatus,
        isMarketOpen,
        lastUpdated: stockDataService.lastUpdateTime || new Date(),
        totalStocks: stocks.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching live prices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock prices. Please try again.'
    });
  }
});

/**
 * @route   POST /api/stocks/force-update
 * @desc    Force update stock prices from Upstox API
 * @access  Public (for testing)
 */
router.post('/force-update', async (req, res) => {
  try {
    console.log('🔄 Force updating stock prices...');
    const updatedPrices = await stockDataService.updateStockPrices();
    
    res.json({
      success: true,
      data: {
        message: 'Stock prices updated successfully',
        updatedStocks: updatedPrices.length,
        stocks: updatedPrices,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error force updating prices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock prices: ' + error.message
    });
  }
});

/**
 * @route   POST /api/stocks/init-previous-close
 * @desc    Initialize previousClose values for stocks (for testing)
 * @access  Public (for testing)
 */
router.post('/init-previous-close', async (req, res) => {
  try {
    console.log('🔧 Initializing previousClose values...');
    await stockDataService.initializePreviousCloseValues();
    
    const stocks = await stockDataService.getLatestPrices();
    
    res.json({
      success: true,
      data: {
        message: 'PreviousClose values initialized successfully',
        stocks: stocks,
        count: stocks.length
      }
    });

  } catch (error) {
    console.error('❌ Error initializing previousClose values:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize previousClose values: ' + error.message
    });
  }
});

/**
 * @route   GET /api/stocks/debug-db
 * @desc    Debug database stocks data
 * @access  Public (for testing)
 */
router.get('/debug-db', async (req, res) => {
  try {
    const StockPrice = require('../models/StockPrice');
    const stocks = await StockPrice.find({}).select('symbol instrumentKey currentPrice lastUpdated');
    
    res.json({
      success: true,
      data: {
        message: 'Database stocks data',
        count: stocks.length,
        stocks: stocks
      }
    });

  } catch (error) {
    console.error('❌ Error fetching debug data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debug data: ' + error.message
    });
  }
});

/**
 * @route   POST /api/stocks/reset-db
 * @desc    Reset database and reinitialize with correct stocks
 * @access  Public (for testing)
 */
router.post('/reset-db', async (req, res) => {
  try {
    const StockPrice = require('../models/StockPrice');
    
    // Clear existing stocks
    await StockPrice.deleteMany({});
    console.log('🗑️ Cleared existing stocks from database');
    
    // Reinitialize
    await stockDataService.initializeStocks();
    
    const stocks = await StockPrice.find({}).select('symbol instrumentKey currentPrice lastUpdated');
    
    res.json({
      success: true,
      data: {
        message: 'Database reset and reinitialized successfully',
        count: stocks.length,
        stocks: stocks
      }
    });

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset database: ' + error.message
    });
  }
});

/**
 * @route   POST /api/stocks/test-price-change
 * @desc    Test P&L calculation by changing HDFC price temporarily
 * @access  Public (for testing)
 */
router.post('/test-price-change', async (req, res) => {
  try {
    const StockPrice = require('../models/StockPrice');
    
    // Update HDFC Bank price to 960 (from 957.8) to simulate a price increase
    const newPrice = 960;
    const stock = await StockPrice.findOneAndUpdate(
      { instrumentKey: 'NSE_EQ|INE040A01034' },
      { 
        currentPrice: newPrice,
        lastUpdated: new Date()
      },
      { new: true }
    );
    
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'HDFC Bank stock not found'
      });
    }
    
    // Now force update portfolios with new price
    const User = require('../models/User');
    const stockPrices = { 'NSE_EQ|INE040A01034': newPrice };
    
    const user = await User.findOne({});
    user.updatePortfolioValues(stockPrices);
    await user.save();
    
    res.json({
      success: true,
      data: {
        message: `HDFC Bank price updated to ₹${newPrice}`,
        oldPrice: 957.8,
        newPrice: newPrice,
        priceChange: newPrice - 957.8,
        expectedPnL: (newPrice - 957.8) * 2, // 2 shares
        updatedStock: stock
      }
    });

  } catch (error) {
    console.error('❌ Error testing price change:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test price change: ' + error.message
    });
  }
});

/**
 * @route   GET /api/stocks/all
 * @desc    Get all available stocks with detailed information
 * @access  Public
 */
router.get('/all', async (req, res) => {
  try {
    const stocks = await stockDataService.getAllStocks();

    res.json({
      success: true,
      data: {
        stocks,
        totalStocks: stocks.length,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching all stocks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stocks. Please try again.'
    });
  }
});

/**
 * @route   GET /api/stocks/:instrumentKey
 * @desc    Get specific stock details by instrument key
 * @access  Public
 */
router.get('/:instrumentKey', async (req, res) => {
  try {
    const { instrumentKey } = req.params;
    
    // Decode the instrument key (in case it's URL encoded)
    const decodedKey = decodeURIComponent(instrumentKey);
    
    const stock = await stockDataService.getStockByInstrumentKey(decodedKey);
    
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found'
      });
    }

    res.json({
      success: true,
      data: {
        stock
      }
    });

  } catch (error) {
    console.error('❌ Error fetching stock details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock details. Please try again.'
    });
  }
});

/**
 * @route   GET /api/stocks/:instrumentKey/history
 * @desc    Get price history for a specific stock
 * @access  Public
 */
router.get('/:instrumentKey/history', async (req, res) => {
  try {
    const { instrumentKey } = req.params;
    const { limit = 50 } = req.query;
    
    // Decode the instrument key
    const decodedKey = decodeURIComponent(instrumentKey);
    
    const history = await stockDataService.getPriceHistory(decodedKey, parseInt(limit));

    res.json({
      success: true,
      data: {
        instrumentKey: decodedKey,
        history,
        totalPoints: history.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching price history:', error);
    
    if (error.message === 'Stock not found') {
      return res.status(404).json({
        success: false,
        message: 'Stock not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch price history. Please try again.'
    });
  }
});

/**
 * @route   GET /api/stocks/market/status
 * @desc    Get current market status and timing information
 * @access  Public
 */
router.get('/market/status', (req, res) => {
  try {
    const marketStatus = stockDataService.getMarketStatus();
    const isMarketOpen = stockDataService.isMarketOpen();
    
    // Calculate next market open/close time
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    
    let nextEvent = 'Market Closed';
    let nextEventTime = null;
    
    if (isMarketOpen) {
      // Market is open, next event is market close
      const today = new Date(istTime);
      today.setHours(15, 30, 0, 0); // 3:30 PM IST
      nextEvent = 'Market Close';
      nextEventTime = today;
    } else {
      // Market is closed, calculate next market open
      let nextOpen = new Date(istTime);
      nextOpen.setHours(9, 15, 0, 0); // 9:15 AM IST
      
      // If it's already past market open time today, set to next trading day
      if (istTime.getHours() > 15 || (istTime.getHours() === 15 && istTime.getMinutes() >= 30)) {
        nextOpen.setDate(nextOpen.getDate() + 1);
      }
      
      // Skip weekends
      while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
        nextOpen.setDate(nextOpen.getDate() + 1);
      }
      
      nextEvent = 'Market Open';
      nextEventTime = nextOpen;
    }

    res.json({
      success: true,
      data: {
        marketStatus,
        isMarketOpen,
        currentTime: istTime,
        nextEvent,
        nextEventTime,
        marketHours: {
          open: '09:15 AM IST',
          close: '03:30 PM IST'
        },
        timezone: 'Asia/Kolkata'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching market status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch market status. Please try again.'
    });
  }
});

/**
 * @route   POST /api/stocks/refresh
 * @desc    Manually refresh stock prices (rate limited)
 * @access  Public
 */
router.post('/refresh', async (req, res) => {
  try {
    // Check if we can update (simple rate limiting)
    const lastUpdate = stockDataService.lastUpdateTime;
    const now = new Date();
    
    if (lastUpdate && (now - lastUpdate) < 10000) { // 10 seconds cooldown
      return res.status(429).json({
        success: false,
        message: 'Please wait before refreshing again. Minimum 10 seconds between updates.',
        nextUpdateAllowed: new Date(lastUpdate.getTime() + 10000)
      });
    }

    // Update stock prices
    const updatedPrices = await stockDataService.updateStockPrices();
    
    res.json({
      success: true,
      message: 'Stock prices refreshed successfully',
      data: {
        updatedStocks: updatedPrices.length,
        lastUpdated: stockDataService.lastUpdateTime
      }
    });

    console.log(`📈 Manual price refresh completed - ${updatedPrices.length} stocks updated`);

  } catch (error) {
    console.error('❌ Error refreshing stock prices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh stock prices. Please try again.'
    });
  }
});

/**
 * @route   GET /api/stocks/search/:query
 * @desc    Search stocks by company name or symbol
 * @access  Public
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const stocks = await stockDataService.getAllStocks();
    
    // Filter stocks based on search query
    const filteredStocks = stocks.filter(stock => 
      stock.companyName.toLowerCase().includes(query.toLowerCase()) ||
      stock.symbol.toLowerCase().includes(query.toLowerCase())
    );

    res.json({
      success: true,
      data: {
        stocks: filteredStocks,
        totalResults: filteredStocks.length,
        searchQuery: query
      }
    });

  } catch (error) {
    console.error('❌ Error searching stocks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search stocks. Please try again.'
    });
  }
});

/**
 * @route   GET /api/stocks/top/gainers
 * @desc    Get top gaining stocks
 * @access  Public
 */
router.get('/top/gainers', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const stocks = await stockDataService.getLatestPrices();
    
    // Sort by change percent (highest first) and limit results
    const topGainers = stocks
      .filter(stock => stock.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        stocks: topGainers,
        totalGainers: topGainers.length,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching top gainers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top gainers. Please try again.'
    });
  }
});

/**
 * @route   GET /api/stocks/top/losers
 * @desc    Get top losing stocks
 * @access  Public
 */
router.get('/top/losers', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const stocks = await stockDataService.getLatestPrices();
    
    // Sort by change percent (lowest first) and limit results
    const topLosers = stocks
      .filter(stock => stock.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        stocks: topLosers,
        totalLosers: topLosers.length,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching top losers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top losers. Please try again.'
    });
  }
});

module.exports = router;
