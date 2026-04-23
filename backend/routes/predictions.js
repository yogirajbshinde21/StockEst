const express = require('express');
const { auth, optionalAuth } = require('../middleware/auth');
const PredictionService = require('../services/PredictionService');

const router = express.Router();

/**
 * @route   GET /api/predictions/today
 * @desc    Get today's / next trading day's AI predictions for all stocks
 * @access  Public (optional auth for personalised data)
 */
router.get('/today', optionalAuth, async (req, res) => {
  try {
    if (!PredictionService.isEnabled()) {
      return res.status(503).json({
        success: false,
        message: 'Prediction feature is currently unavailable.'
      });
    }

    const predictions = await PredictionService.getLatestPredictions();

    // If user is authenticated, also get their predictions for this date
    let userPredictions = [];
    if (req.user) {
      userPredictions = await PredictionService.getUserHistory(req.user._id, 4);
    }

    res.json({
      success: true,
      data: {
        predictions,
        userPredictions,
        disclaimer: 'These predictions are for educational purposes only and do not constitute investment advice. Past performance does not guarantee future results.'
      }
    });
  } catch (error) {
    console.error('❌ Error fetching predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch predictions.'
    });
  }
});

/**
 * @route   GET /api/predictions/history/:instrumentKey
 * @desc    Get prediction history for a stock (last 30 days)
 * @access  Public
 */
router.get('/history/:instrumentKey', async (req, res) => {
  try {
    const { instrumentKey } = req.params;
    const days = parseInt(req.query.days) || 30;

    const history = await PredictionService.getPredictionHistory(
      decodeURIComponent(instrumentKey),
      Math.min(days, 90) // cap at 90 days
    );

    res.json({
      success: true,
      data: { history }
    });
  } catch (error) {
    console.error('❌ Error fetching prediction history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prediction history.'
    });
  }
});

/**
 * @route   GET /api/predictions/indicators/:instrumentKey
 * @desc    Get educational indicator breakdown for a stock
 * @access  Public
 */
router.get('/indicators/:instrumentKey', async (req, res) => {
  try {
    const { instrumentKey } = req.params;
    const indicators = await PredictionService.getStockIndicators(
      decodeURIComponent(instrumentKey)
    );

    if (!indicators) {
      return res.status(404).json({
        success: false,
        message: 'Insufficient data for indicator analysis.'
      });
    }

    res.json({
      success: true,
      data: {
        indicators,
        educationalNotes: {
          rsi: 'RSI (Relative Strength Index) measures momentum on a 0-100 scale. Below 30 = oversold (may bounce), above 70 = overbought (may pull back).',
          macd: 'MACD shows the relationship between two moving averages. A bullish MACD suggests upward momentum.',
          sma: 'SMA (Simple Moving Average) smooths price data. Price above SMA suggests strength; below suggests weakness.',
          bollinger: 'Bollinger Bands show volatility. Price near the upper band may face resistance; near lower band may find support.',
          stochastic: 'Stochastic Oscillator compares closing price to its price range. Below 20 = oversold, above 80 = overbought.'
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching indicators:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock indicators.'
    });
  }
});

/**
 * @route   POST /api/predictions/challenge/submit
 * @desc    Submit user's prediction for a stock
 * @access  Protected (authenticated users only)
 */
router.post('/challenge/submit', auth, async (req, res) => {
  try {
    const { instrumentKey, predictedPrice } = req.body;

    // Input validation & sanitisation
    if (!instrumentKey || typeof instrumentKey !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'instrumentKey is required and must be a string.'
      });
    }

    const price = parseFloat(predictedPrice);
    if (isNaN(price) || price <= 0 || price > 1000000) {
      return res.status(400).json({
        success: false,
        message: 'predictedPrice must be a positive number less than ₹10,00,000.'
      });
    }

    const sanitisedKey = instrumentKey.trim().substring(0, 100);
    const result = await PredictionService.submitUserPrediction(
      req.user._id,
      sanitisedKey,
      parseFloat(price.toFixed(2))
    );

    res.json({
      success: true,
      message: 'Prediction submitted! You earned 5 XP. Come back after market close to see how you did!',
      data: result
    });
  } catch (error) {
    console.error('❌ Error submitting prediction:', error);

    if (error.message.includes('No AI prediction')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted a prediction for this stock today.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit prediction.'
    });
  }
});

/**
 * @route   GET /api/predictions/challenge/my-history
 * @desc    Get user's prediction challenge history
 * @access  Protected
 */
router.get('/challenge/my-history', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const history = await PredictionService.getUserHistory(req.user._id, limit);
    const streak = await PredictionService.getUserStreak(req.user._id);

    res.json({
      success: true,
      data: {
        history,
        streak,
        totalPredictions: history.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching user prediction history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prediction history.'
    });
  }
});

/**
 * @route   GET /api/predictions/challenge/leaderboard
 * @desc    Get top predictors leaderboard
 * @access  Public
 */
router.get('/challenge/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const leaderboard = await PredictionService.getLeaderboard(limit);

    res.json({
      success: true,
      data: { leaderboard }
    });
  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard.'
    });
  }
});

/**
 * @route   POST /api/predictions/generate
 * @desc    Manually trigger prediction generation (admin/testing)
 * @access  Protected
 */
router.post('/generate', auth, async (req, res) => {
  try {
    const results = await PredictionService.generateDailyPredictions();
    res.json({
      success: true,
      message: `Generated predictions for ${results.length} stocks.`,
      data: results
    });
  } catch (error) {
    console.error('❌ Error generating predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate predictions.'
    });
  }
});

/**
 * @route   POST /api/predictions/evaluate
 * @desc    Manually trigger prediction evaluation (admin/testing)
 * @access  Protected
 */
router.post('/evaluate', auth, async (req, res) => {
  try {
    await PredictionService.evaluatePredictions();
    res.json({
      success: true,
      message: 'Prediction evaluation completed.'
    });
  } catch (error) {
    console.error('❌ Error evaluating predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to evaluate predictions.'
    });
  }
});

/**
 * @route   GET /api/predictions/backtest/:symbol
 * @desc    Run backtesting on a stock (admin/testing)
 * @access  Protected
 */
router.get('/backtest/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const testDays = Math.min(parseInt(req.query.days) || 20, 60);
    const results = await PredictionService.runBacktest(symbol.toUpperCase(), testDays);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('❌ Error running backtest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run backtest.'
    });
  }
});

module.exports = router;
