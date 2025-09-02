const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const stockDataService = require('../services/stockDataService');
const achievementService = require('../services/AchievementService');
const chatbotService = require('../services/ChatbotService');
const portfolioAnalyticsService = require('../services/PortfolioAnalyticsService');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/trading/debug-portfolio
 * @desc    Debug user portfolio (for testing)
 * @access  Private
 */
router.get('/debug-portfolio', async (req, res) => {
  try {
    // For debugging, find any user
    const user = await User.findOne({});
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: user.email,
        virtualBalance: user.virtualBalance,
        totalInvested: user.totalInvested,
        totalPortfolioValue: user.totalPortfolioValue,
        totalProfitLoss: user.totalProfitLoss,
        totalProfitLossPercent: user.totalProfitLossPercent,
        portfolio: user.portfolio.map(item => ({
          symbol: item.symbol,
          instrumentKey: item.instrumentKey,
          quantity: item.quantity,
          averagePrice: item.averagePrice,
          currentPrice: item.currentPrice,
          totalInvested: item.totalInvested,
          currentValue: item.currentValue,
          profitLoss: item.profitLoss,
          profitLossPercentage: item.profitLossPercent
        })),
        lastTransaction: user.transactions[user.transactions.length - 1]
      }
    });

  } catch (error) {
    console.error('❌ Debug portfolio error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get portfolio debug info'
    });
  }
});

/**
 * @route   POST /api/trading/buy
 * @desc    Buy stocks with virtual money
 * @access  Private
 */
router.post('/buy', [
  auth,
  body('instrumentKey')
    .notEmpty()
    .withMessage('Instrument key is required'),
  
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { instrumentKey, quantity, price } = req.body;
    const userId = req.user._id;

    // Get current stock information
    const stock = await stockDataService.getStockByInstrumentKey(instrumentKey);
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found'
      });
    }

    // Validate price (should be close to current market price)
    const currentPrice = stock.currentPrice;
    const priceVariation = Math.abs(price - currentPrice) / currentPrice;
    
    if (priceVariation > 0.05) { // Allow 5% variation
      return res.status(400).json({
        success: false,
        message: `Price too far from current market price. Current price: ₹${currentPrice.toFixed(2)}`
      });
    }

    // Calculate total cost
    const totalCost = quantity * price;

    // Get user and check balance
    const user = await User.findById(userId);
    if (user.virtualBalance < totalCost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Required: ₹${totalCost.toFixed(2)}, Available: ₹${user.virtualBalance.toFixed(2)}`
      });
    }

    // Check if user already has this stock in portfolio
    const existingHolding = user.portfolio.find(item => item.instrumentKey === instrumentKey);

    if (existingHolding) {
      // Update existing holding
      const newTotalQuantity = existingHolding.quantity + quantity;
      const newTotalInvested = existingHolding.totalInvested + totalCost;
      const newAveragePrice = newTotalInvested / newTotalQuantity;

      existingHolding.quantity = newTotalQuantity;
      existingHolding.averagePrice = newAveragePrice;
      existingHolding.totalInvested = newTotalInvested;
      existingHolding.currentPrice = currentPrice;
      existingHolding.currentValue = newTotalQuantity * currentPrice;
      existingHolding.profitLoss = existingHolding.currentValue - existingHolding.totalInvested;
      existingHolding.profitLossPercent = existingHolding.totalInvested > 0 
        ? ((existingHolding.profitLoss / existingHolding.totalInvested) * 100) 
        : 0;
    } else {
      // Add new holding to portfolio
      const newHolding = {
        symbol: stock.symbol,
        instrumentKey: stock.instrumentKey,
        companyName: stock.companyName,
        quantity: quantity,
        averagePrice: price,
        currentPrice: currentPrice,
        totalInvested: totalCost,
        currentValue: quantity * currentPrice,
        profitLoss: (quantity * currentPrice) - totalCost,
        profitLossPercent: ((quantity * currentPrice) - totalCost) / totalCost * 100
      };

      user.portfolio.push(newHolding);
    }

    // Add transaction to history
    const transaction = {
      type: 'BUY',
      symbol: stock.symbol,
      instrumentKey: stock.instrumentKey,
      companyName: stock.companyName,
      quantity: quantity,
      price: price,
      totalAmount: totalCost,
      timestamp: new Date()
    };

    user.transactions.push(transaction);

    // Update user balance
    user.virtualBalance -= totalCost;

    // Update portfolio totals
    const stockPrices = {};
    stockPrices[instrumentKey] = currentPrice;
    user.updatePortfolioValues(stockPrices);

    // Save user
    await user.save();

    // Check for achievements after successful trade
    try {
      await achievementService.onTradeCompleted(userId, transaction);
    } catch (achievementError) {
      console.error('❌ Achievement check error:', achievementError);
      // Don't fail the trade if achievement check fails
    }

    // Refresh chatbot portfolio cache for real-time awareness
    try {
      await chatbotService.refreshPortfolioCache(userId);
      console.log('✅ Chatbot portfolio cache refreshed after buy trade');
    } catch (cacheError) {
      console.error('❌ Chatbot cache refresh error:', cacheError);
      // Don't fail the trade if cache refresh fails
    }

    // Create/update portfolio snapshot for analytics
    try {
      await portfolioAnalyticsService.createDailySnapshot(userId);
      console.log('✅ Portfolio snapshot updated after buy trade');
    } catch (snapshotError) {
      console.error('❌ Portfolio snapshot error:', snapshotError);
      // Don't fail the trade if snapshot creation fails
    }

    res.json({
      success: true,
      message: `Successfully bought ${quantity} shares of ${stock.companyName}`,
      data: {
        transaction,
        newBalance: user.virtualBalance,
        portfolioValue: user.totalPortfolioValue,
        totalBalance: user.getTotalBalance()
      }
    });

    console.log(`✅ BUY order executed: ${user.email} bought ${quantity} ${stock.symbol} at ₹${price}`);

  } catch (error) {
    console.error('❌ Buy order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute buy order. Please try again.'
    });
  }
});

/**
 * @route   POST /api/trading/sell
 * @desc    Sell stocks from portfolio
 * @access  Private
 */
router.post('/sell', [
  auth,
  body('instrumentKey')
    .notEmpty()
    .withMessage('Instrument key is required'),
  
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { instrumentKey, quantity, price } = req.body;
    const userId = req.user._id;

    // Get current stock information
    const stock = await stockDataService.getStockByInstrumentKey(instrumentKey);
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found'
      });
    }

    // Validate price (should be close to current market price)
    const currentPrice = stock.currentPrice;
    const priceVariation = Math.abs(price - currentPrice) / currentPrice;
    
    if (priceVariation > 0.05) { // Allow 5% variation
      return res.status(400).json({
        success: false,
        message: `Price too far from current market price. Current price: ₹${currentPrice.toFixed(2)}`
      });
    }

    // Get user and check holdings
    const user = await User.findById(userId);
    const holding = user.portfolio.find(item => item.instrumentKey === instrumentKey);

    if (!holding) {
      return res.status(400).json({
        success: false,
        message: 'You do not own this stock'
      });
    }

    if (holding.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient shares. You own ${holding.quantity} shares, trying to sell ${quantity}`
      });
    }

    // Calculate sale amount
    const saleAmount = quantity * price;

    // Calculate profit/loss for this sale
    const avgCostForSoldShares = holding.averagePrice * quantity;
    const profitLossOnSale = saleAmount - avgCostForSoldShares;
    
    // Store original quantity before modification
    const originalQuantity = holding.quantity;
    const isCompletelySellingOut = quantity === originalQuantity;

    // Update holding
    if (isCompletelySellingOut) {
      // Selling all shares - remove from portfolio
      user.portfolio = user.portfolio.filter(item => item.instrumentKey !== instrumentKey);
    } else {
      // Partial sale - update quantities
      holding.quantity -= quantity;
      holding.totalInvested -= avgCostForSoldShares;
      holding.currentPrice = currentPrice;
      holding.currentValue = holding.quantity * currentPrice;
      holding.profitLoss = holding.currentValue - holding.totalInvested;
      holding.profitLossPercent = holding.totalInvested > 0 
        ? ((holding.profitLoss / holding.totalInvested) * 100) 
        : 0;
    }

    // Add transaction to history with detailed information
    const transaction = {
      type: 'SELL',
      symbol: stock.symbol,
      instrumentKey: stock.instrumentKey,
      companyName: stock.companyName,
      quantity: quantity,
      price: price,
      totalAmount: saleAmount,
      profitLoss: profitLossOnSale,
      profitLossPercent: avgCostForSoldShares > 0 ? ((profitLossOnSale / avgCostForSoldShares) * 100) : 0,
      originalInvestment: avgCostForSoldShares,
      timestamp: new Date()
    };

    user.transactions.push(transaction);

    // Update user balance
    user.virtualBalance += saleAmount;

    // Update portfolio totals
    const stockPrices = {};
    stockPrices[instrumentKey] = currentPrice;
    user.updatePortfolioValues(stockPrices);

    // Save user
    await user.save();

    // Check for achievements after successful trade
    try {
      await achievementService.onTradeCompleted(userId, transaction);
    } catch (achievementError) {
      console.error('❌ Achievement check error:', achievementError);
      // Don't fail the trade if achievement check fails
    }

    // Refresh chatbot portfolio cache for real-time awareness
    try {
      await chatbotService.refreshPortfolioCache(userId);
      console.log('✅ Chatbot portfolio cache refreshed after sell trade');
    } catch (cacheError) {
      console.error('❌ Chatbot cache refresh error:', cacheError);
      // Don't fail the trade if cache refresh fails
    }

    // Create/update portfolio snapshot for analytics
    try {
      await portfolioAnalyticsService.createDailySnapshot(userId);
      console.log('✅ Portfolio snapshot updated after sell trade');
    } catch (snapshotError) {
      console.error('❌ Portfolio snapshot error:', snapshotError);
      // Don't fail the trade if snapshot creation fails
    }

    res.json({
      success: true,
      message: `Successfully sold ${quantity} shares of ${stock.companyName}`,
      data: {
        transaction,
        saleAmount,
        profitLossOnSale,
        profitLossPercent: avgCostForSoldShares > 0 ? ((profitLossOnSale / avgCostForSoldShares) * 100) : 0,
        originalInvestment: avgCostForSoldShares,
        newBalance: user.virtualBalance,
        portfolioValue: user.totalPortfolioValue,
        totalBalance: user.getTotalBalance(),
        isCompletelySellingOut: isCompletelySellingOut,
        remainingShares: isCompletelySellingOut ? 0 : originalQuantity - quantity,
        educationalNote: profitLossOnSale < 0 
          ? "Loss is normal in stock market - यह शेयर बाज़ार में सामान्य है" 
          : "Congratulations on your profitable trade!"
      }
    });

    console.log(`✅ SELL order executed: ${user.email} sold ${quantity} ${stock.symbol} at ₹${price}`);

  } catch (error) {
    console.error('❌ Sell order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute sell order. Please try again.'
    });
  }
});

/**
 * @route   GET /api/trading/portfolio
 * @desc    Get user's portfolio with current values
 * @access  Private
 */
router.get('/portfolio', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Update portfolio with current prices
    const stocks = await stockDataService.getLatestPrices();
    const stockPrices = {};
    
    stocks.forEach(stock => {
      stockPrices[stock.instrumentKey] = stock.currentPrice;
    });

    user.updatePortfolioValues(stockPrices);
    await user.save();

    res.json({
      success: true,
      data: {
        portfolio: user.portfolio,
        summary: {
          totalInvested: user.totalInvested,
          currentValue: user.totalPortfolioValue,
          totalProfitLoss: user.totalProfitLoss,
          totalProfitLossPercent: user.totalProfitLossPercent,
          cashBalance: user.virtualBalance,
          totalBalance: user.getTotalBalance()
        },
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Portfolio fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch portfolio. Please try again.'
    });
  }
});

/**
 * @route   GET /api/trading/transactions
 * @desc    Get user's transaction history
 * @access  Private
 */
router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const user = await User.findById(req.user._id);

    let transactions = user.transactions;

    // Filter by transaction type if specified
    if (type && ['BUY', 'SELL'].includes(type.toUpperCase())) {
      transactions = transactions.filter(t => t.type === type.toUpperCase());
    }

    // Sort by timestamp (newest first)
    transactions = transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        transactions: paginatedTransactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(transactions.length / limit),
          totalTransactions: transactions.length,
          hasNext: endIndex < transactions.length,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Transaction history fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history. Please try again.'
    });
  }
});

/**
 * @route   GET /api/trading/summary
 * @desc    Get trading summary and statistics
 * @access  Private
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Calculate trading statistics
    const buyTransactions = user.transactions.filter(t => t.type === 'BUY');
    const sellTransactions = user.transactions.filter(t => t.type === 'SELL');

    const totalBuyAmount = buyTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalSellAmount = sellTransactions.reduce((sum, t) => sum + t.totalAmount, 0);

    // Update portfolio with current prices
    const stocks = await stockDataService.getLatestPrices();
    const stockPrices = {};
    
    stocks.forEach(stock => {
      stockPrices[stock.instrumentKey] = stock.currentPrice;
    });

    user.updatePortfolioValues(stockPrices);

    const summary = {
      account: {
        startingBalance: 100000, // Initial virtual balance
        currentCashBalance: user.virtualBalance,
        totalPortfolioValue: user.totalPortfolioValue,
        totalBalance: user.getTotalBalance(),
        totalProfitLoss: user.getTotalBalance() - 100000,
        totalProfitLossPercent: ((user.getTotalBalance() - 100000) / 100000) * 100
      },
      portfolio: {
        totalInvested: user.totalInvested,
        currentValue: user.totalPortfolioValue,
        profitLoss: user.totalProfitLoss,
        profitLossPercent: user.totalProfitLossPercent,
        totalStocks: user.portfolio.length
      },
      trading: {
        totalTransactions: user.transactions.length,
        buyTransactions: buyTransactions.length,
        sellTransactions: sellTransactions.length,
        totalBuyAmount,
        totalSellAmount,
        netTradingPL: totalSellAmount - totalBuyAmount
      },
      performance: {
        bestPerformer: user.portfolio.length > 0 
          ? user.portfolio.reduce((best, stock) => 
              stock.profitLossPercent > best.profitLossPercent ? stock : best
            )
          : null,
        worstPerformer: user.portfolio.length > 0 
          ? user.portfolio.reduce((worst, stock) => 
              stock.profitLossPercent < worst.profitLossPercent ? stock : worst
            )
          : null
      }
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ Trading summary fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trading summary. Please try again.'
    });
  }
});

/**
 * @route   POST /api/trading/validate-order
 * @desc    Validate buy/sell order before execution
 * @access  Private
 */
router.post('/validate-order', [
  auth,
  body('type')
    .isIn(['BUY', 'SELL'])
    .withMessage('Order type must be BUY or SELL'),
  
  body('instrumentKey')
    .notEmpty()
    .withMessage('Instrument key is required'),
  
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type, instrumentKey, quantity, price } = req.body;
    const user = await User.findById(req.user._id);

    // Get stock information
    const stock = await stockDataService.getStockByInstrumentKey(instrumentKey);
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found'
      });
    }

    const validation = {
      valid: true,
      warnings: [],
      errors: []
    };

    // Price validation
    const currentPrice = stock.currentPrice;
    const priceVariation = Math.abs(price - currentPrice) / currentPrice;
    
    if (priceVariation > 0.05) {
      validation.valid = false;
      validation.errors.push(`Price too far from current market price. Current: ₹${currentPrice.toFixed(2)}`);
    } else if (priceVariation > 0.02) {
      validation.warnings.push(`Price differs from market price by ${(priceVariation * 100).toFixed(1)}%`);
    }

    if (type === 'BUY') {
      const totalCost = quantity * price;
      
      if (user.virtualBalance < totalCost) {
        validation.valid = false;
        validation.errors.push(`Insufficient balance. Required: ₹${totalCost.toFixed(2)}, Available: ₹${user.virtualBalance.toFixed(2)}`);
      }
      
      if (totalCost > user.virtualBalance * 0.5) {
        validation.warnings.push('This order will use more than 50% of your available balance');
      }
    } else if (type === 'SELL') {
      const holding = user.portfolio.find(item => item.instrumentKey === instrumentKey);
      
      if (!holding) {
        validation.valid = false;
        validation.errors.push('You do not own this stock');
      } else if (holding.quantity < quantity) {
        validation.valid = false;
        validation.errors.push(`Insufficient shares. You own ${holding.quantity}, trying to sell ${quantity}`);
      }
    }

    res.json({
      success: true,
      data: {
        validation,
        orderDetails: {
          type,
          stock: {
            symbol: stock.symbol,
            companyName: stock.companyName,
            currentPrice: currentPrice
          },
          quantity,
          requestedPrice: price,
          totalAmount: quantity * price,
          priceVariation: priceVariation * 100
        }
      }
    });

  } catch (error) {
    console.error('❌ Order validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate order. Please try again.'
    });
  }
});

module.exports = router;
