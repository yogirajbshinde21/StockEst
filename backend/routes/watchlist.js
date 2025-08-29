const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const stockDataService = require('../services/stockDataService');

const router = express.Router();

/**
 * @route   GET /api/watchlist
 * @desc    Get user's watchlist
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('watchlist');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get current prices for watchlist stocks
    const watchlistWithPrices = await Promise.all(
      user.watchlist.map(async (item) => {
        try {
          const stock = await stockDataService.getStockByInstrumentKey(item.instrumentKey);
          return {
            ...item.toObject(),
            currentPrice: stock ? stock.currentPrice : 0,
            change: stock ? stock.change : 0,
            changePercent: stock ? stock.changePercent : 0
          };
        } catch (error) {
          console.error(`Error getting price for ${item.symbol}:`, error);
          return {
            ...item.toObject(),
            currentPrice: 0,
            change: 0,
            changePercent: 0
          };
        }
      })
    );

    res.json({
      success: true,
      data: {
        watchlist: watchlistWithPrices,
        count: watchlistWithPrices.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching watchlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch watchlist'
    });
  }
});

/**
 * @route   POST /api/watchlist/add
 * @desc    Add stock to watchlist
 * @access  Private
 */
router.post('/add', auth, async (req, res) => {
  try {
    const { instrumentKey, symbol, companyName, alertPrice } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!instrumentKey || !symbol || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Stock information is required'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if stock is already in watchlist
    const existingItem = user.watchlist.find(item => item.instrumentKey === instrumentKey);
    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Stock is already in your watchlist'
      });
    }

    // Add to watchlist
    const watchlistItem = {
      symbol,
      instrumentKey,
      companyName,
      alertPrice: alertPrice || null,
      alertEnabled: alertPrice ? true : false,
      addedAt: new Date()
    };

    user.watchlist.push(watchlistItem);
    await user.save();

    res.json({
      success: true,
      message: `${symbol} added to watchlist`,
      data: { watchlistItem }
    });

  } catch (error) {
    console.error('❌ Error adding to watchlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add stock to watchlist'
    });
  }
});

/**
 * @route   DELETE /api/watchlist/remove/:instrumentKey
 * @desc    Remove stock from watchlist
 * @access  Private
 */
router.delete('/remove/:instrumentKey', auth, async (req, res) => {
  try {
    const { instrumentKey } = req.params;
    const userId = req.user._id;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find and remove the stock from watchlist
    const initialLength = user.watchlist.length;
    user.watchlist = user.watchlist.filter(item => item.instrumentKey !== instrumentKey);

    if (user.watchlist.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found in watchlist'
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Stock removed from watchlist'
    });

  } catch (error) {
    console.error('❌ Error removing from watchlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove stock from watchlist'
    });
  }
});

/**
 * @route   PUT /api/watchlist/alert/:instrumentKey
 * @desc    Update price alert for watchlist item
 * @access  Private
 */
router.put('/alert/:instrumentKey', auth, async (req, res) => {
  try {
    const { instrumentKey } = req.params;
    const { alertPrice, alertEnabled } = req.body;
    const userId = req.user._id;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the watchlist item
    const watchlistItem = user.watchlist.find(item => item.instrumentKey === instrumentKey);
    if (!watchlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found in watchlist'
      });
    }

    // Update alert settings
    if (alertPrice !== undefined) {
      watchlistItem.alertPrice = alertPrice;
    }
    if (alertEnabled !== undefined) {
      watchlistItem.alertEnabled = alertEnabled;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Alert settings updated',
      data: { watchlistItem }
    });

  } catch (error) {
    console.error('❌ Error updating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert settings'
    });
  }
});

module.exports = router;
