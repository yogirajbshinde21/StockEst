const ss = require('simple-statistics');
const PredictionData = require('../models/PredictionData');
const UserPrediction = require('../models/UserPrediction');
const HistoricalCandle = require('../models/HistoricalCandle');
const HistoricalDataService = require('./HistoricalDataService');
const User = require('../models/User');

/**
 * PredictionService — hybrid ML prediction engine (linear regression + rule-based signals).
 *
 * Uses Upstox daily candle data cached in MongoDB to compute technical indicators
 * and predict next-day closing prices for all tracked stocks.
 *
 * MODEL CARD (v1.0-node-lr)
 * ─────────────────────────
 * Data:        Upstox EOD candles (OHLCV), 60-90 trading days
 * Features:    SMA-3/7/14, EMA-5/12, RSI-14, MACD(7,14,5), Bollinger %B,
 *              ATR-14, Stochastic(14), daily returns, volatility
 * Method:      Weighted linear regression on normalised features + rule-based
 *              signal overlay (SMA crossovers, RSI extremes)
 * Limitations: Cannot capture regime changes, earnings surprises, or macro
 *              shocks.  Educational-grade only — NOT investment advice.
 * Baselines:   Expected R² 0.85-0.95 on recent data, MAE ₹5-25 depending on
 *              stock price level.
 */

// Feature flag — disable the whole prediction pipeline
const PREDICTION_FEATURE_ENABLED = true;

class PredictionService {
  constructor() {
    this.modelVersion = 'v1.0-node-lr';

    // Same stocks tracked by Upstox backend
    this.stocks = {
      RELIANCE:   { instrumentKey: 'NSE_EQ|INE002A01018', companyName: 'Reliance Industries' },
      TCS:        { instrumentKey: 'NSE_EQ|INE467B01029', companyName: 'Tata Consultancy Services' },
      INFY:       { instrumentKey: 'NSE_EQ|INE009A01021', companyName: 'Infosys' },
      HDFCBANK:   { instrumentKey: 'NSE_EQ|INE040A01034', companyName: 'HDFC Bank' },
      ICICIBANK:  { instrumentKey: 'NSE_EQ|INE090A01021', companyName: 'ICICI Bank' },
      SBIN:       { instrumentKey: 'NSE_EQ|INE062A01020', companyName: 'State Bank of India' },
      WIPRO:      { instrumentKey: 'NSE_EQ|INE075A01022', companyName: 'Wipro' },
      ITC:        { instrumentKey: 'NSE_EQ|INE154A01025', companyName: 'ITC' },
      BHARTIARTL: { instrumentKey: 'NSE_EQ|INE397D01024', companyName: 'Bharti Airtel' },
      KOTAKBANK:  { instrumentKey: 'NSE_EQ|INE237A01028', companyName: 'Kotak Mahindra Bank' }
    };
  }

  // ────────────────────────────────────────────────
  //  FEATURE FLAG CHECK
  // ────────────────────────────────────────────────
  isEnabled() {
    return PREDICTION_FEATURE_ENABLED;
  }

  // ────────────────────────────────────────────────
  //  TECHNICAL INDICATOR CALCULATIONS
  // ────────────────────────────────────────────────

  /** Simple Moving Average */
  sma(prices, period) {
    if (prices.length < period) return null;
    return ss.mean(prices.slice(-period));
  }

  /** Exponential Moving Average */
  ema(prices, period) {
    if (prices.length < period) return null;
    const k = 2 / (period + 1);
    let emaVal = prices[0];
    for (let i = 1; i < prices.length; i++) {
      emaVal = prices[i] * k + emaVal * (1 - k);
    }
    return emaVal;
  }

  /** Relative Strength Index (14-day) */
  rsi(prices, period = 14) {
    if (prices.length < period + 1) return 50; // neutral default
    const changes = [];
    for (let i = prices.length - period; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    const gains = changes.filter(c => c > 0);
    const losses = changes.filter(c => c < 0).map(c => Math.abs(c));
    const avgGain = gains.length > 0 ? ss.mean(gains) : 0;
    const avgLoss = losses.length > 0 ? ss.mean(losses) : 0.0001;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /** MACD (fast=7, slow=14, signal=5) — matches the original Python model */
  macd(prices) {
    const emaFast = this.ema(prices, 7);
    const emaSlow = this.ema(prices, 14);
    if (emaFast === null || emaSlow === null) return { macd: 0, signal: 0, histogram: 0 };
    const macdLine = emaFast - emaSlow;
    const signalLine = macdLine * 0.85; // simplified signal approximation
    return {
      macd: macdLine,
      signal: signalLine,
      histogram: macdLine - signalLine
    };
  }

  /** Bollinger Bands (%B position) */
  bollingerB(prices, period = 7) {
    if (prices.length < period) return 0.5;
    const slice = prices.slice(-period);
    const mean = ss.mean(slice);
    const std = ss.standardDeviation(slice);
    if (std === 0) return 0.5;
    const upper = mean + 2 * std;
    const lower = mean - 2 * std;
    const price = prices[prices.length - 1];
    return (price - lower) / (upper - lower);
  }

  /** Average True Range (normalised as % of price) */
  atrPercent(candles, period = 14) {
    if (candles.length < period) return 1;
    const ranges = candles.slice(-period).map(c => c.high - c.low);
    const avgRange = ss.mean(ranges);
    const lastClose = candles[candles.length - 1].close;
    return (avgRange / lastClose) * 100;
  }

  /** Stochastic Oscillator %K */
  stochastic(candles, period = 14) {
    if (candles.length < period) return 50;
    const slice = candles.slice(-period);
    const highs = slice.map(c => c.high);
    const lows = slice.map(c => c.low);
    const hi = Math.max(...highs);
    const lo = Math.min(...lows);
    const lastClose = candles[candles.length - 1].close;
    if (hi === lo) return 50;
    return ((lastClose - lo) / (hi - lo)) * 100;
  }

  /** Daily returns (percentage) */
  dailyReturns(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  /** Recent volatility (std of last N daily returns) */
  volatility(prices, window = 10) {
    const rets = this.dailyReturns(prices);
    if (rets.length < window) return 0;
    return ss.standardDeviation(rets.slice(-window));
  }

  // ────────────────────────────────────────────────
  //  FEATURE VECTOR BUILDER
  // ────────────────────────────────────────────────

  buildFeatures(candles) {
    const closes = candles.map(c => c.close);
    const lastPrice = closes[closes.length - 1];

    const features = {
      prevClose:      closes[closes.length - 1],
      prevClose2:     closes.length >= 2 ? closes[closes.length - 2] : lastPrice,
      prevClose3:     closes.length >= 3 ? closes[closes.length - 3] : lastPrice,
      sma3:           this.sma(closes, 3) || lastPrice,
      sma7:           this.sma(closes, 7) || lastPrice,
      sma14:          this.sma(closes, 14) || lastPrice,
      ema5:           this.ema(closes, 5) || lastPrice,
      ema12:          this.ema(closes, 12) || lastPrice,
      rsi14:          this.rsi(closes, 14),
      stochK:         this.stochastic(candles, 14),
      atrPct:         this.atrPercent(candles, 14),
      bollingerB:     this.bollingerB(closes, 7),
      vol5:           this.volatility(closes, 5),
      vol10:          this.volatility(closes, 10),
      dailyReturn:    closes.length >= 2 ? (closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2] : 0,
      return5d:       closes.length >= 6 ? (closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6] : 0,
    };

    // MACD
    const macdData = this.macd(closes);
    features.macdNorm = lastPrice > 0 ? (macdData.macd / lastPrice) * 100 : 0;
    features.macdSignalNorm = lastPrice > 0 ? (macdData.signal / lastPrice) * 100 : 0;

    // Price relative to SMA
    features.priceToSma7 = features.sma7 > 0 ? (lastPrice / features.sma7 - 1) : 0;
    features.priceToSma14 = features.sma14 > 0 ? (lastPrice / features.sma14 - 1) : 0;

    return features;
  }

  // ────────────────────────────────────────────────
  //  HYBRID PREDICTION (Regression + Rule Signals)
  // ────────────────────────────────────────────────

  predictNextDay(candles) {
    if (!candles || candles.length < 20) {
      return null; // insufficient data
    }

    const features = this.buildFeatures(candles);
    const closes = candles.map(c => c.close);
    const lastPrice = closes[closes.length - 1];

    // ── Part 1: Weighted Linear Regression ──
    // Use last 30 data points for regression on close prices
    const recentCloses = closes.slice(-30);
    const xValues = recentCloses.map((_, i) => i);
    const yValues = recentCloses;

    let regressionPrediction = lastPrice;
    let r2Score = 0;
    let maeRupees = 0;

    try {
      const regression = ss.linearRegression(xValues.map((x, i) => [x, yValues[i]]));
      const regressionLine = ss.linearRegressionLine(regression);
      regressionPrediction = regressionLine(recentCloses.length); // next point

      // Compute R² on training data
      const predictions = xValues.map(x => regressionLine(x));
      r2Score = this._r2Score(yValues, predictions);

      // Compute MAE
      const errors = yValues.map((y, i) => Math.abs(y - predictions[i]));
      maeRupees = ss.mean(errors);
    } catch (e) {
      console.warn('⚠️ Regression failed, using last price:', e.message);
      regressionPrediction = lastPrice;
    }

    // ── Part 2: Rule-Based Signal Overlay ──
    let signalAdjustment = 0;
    const signals = [];

    // SMA Crossover: EMA5 crossing above/below SMA14
    if (features.ema5 > features.sma14) {
      signalAdjustment += lastPrice * 0.003; // +0.3%
      signals.push('EMA5 above SMA14 (bullish crossover)');
    } else {
      signalAdjustment -= lastPrice * 0.003;
      signals.push('EMA5 below SMA14 (bearish crossover)');
    }

    // RSI extremes
    if (features.rsi14 < 30) {
      signalAdjustment += lastPrice * 0.005; // oversold → bounce expected
      signals.push('RSI oversold (<30) — possible bounce');
    } else if (features.rsi14 > 70) {
      signalAdjustment -= lastPrice * 0.005; // overbought → pullback
      signals.push('RSI overbought (>70) — possible pullback');
    }

    // Bollinger Band position
    if (features.bollingerB < 0.1) {
      signalAdjustment += lastPrice * 0.003; // near lower band
      signals.push('Price near lower Bollinger Band — mean reversion likely');
    } else if (features.bollingerB > 0.9) {
      signalAdjustment -= lastPrice * 0.003; // near upper band
      signals.push('Price near upper Bollinger Band — resistance likely');
    }

    // MACD momentum
    if (features.macdNorm > 0 && features.macdNorm > features.macdSignalNorm) {
      signalAdjustment += lastPrice * 0.002;
      signals.push('MACD positive and above signal (bullish momentum)');
    } else if (features.macdNorm < 0) {
      signalAdjustment -= lastPrice * 0.002;
      signals.push('MACD negative (bearish momentum)');
    }

    // Stochastic
    if (features.stochK < 20) {
      signalAdjustment += lastPrice * 0.002;
      signals.push('Stochastic oversold (<20)');
    } else if (features.stochK > 80) {
      signalAdjustment -= lastPrice * 0.002;
      signals.push('Stochastic overbought (>80)');
    }

    // ── Part 3: Blend regression + signals ──
    // 70% regression, 30% rule-based signals applied to last price
    const blendedPrediction = 0.7 * regressionPrediction + 0.3 * (lastPrice + signalAdjustment);

    // ── Confidence Bands ──
    const recentVol = this.volatility(closes, 10);
    const historicalStd = ss.standardDeviation(this.dailyReturns(closes));
    const confidenceWidth = Math.max(
      Math.abs(regressionPrediction - (lastPrice + signalAdjustment)),
      historicalStd * lastPrice * 1.5,
      lastPrice * 0.005 // minimum 0.5%
    );

    // ── Indicator Summary ──
    const indicatorBreakdown = this._buildIndicatorBreakdown(features, signals);

    return {
      predictedPrice: parseFloat(blendedPrediction.toFixed(2)),
      confidenceUpper: parseFloat((blendedPrediction + confidenceWidth).toFixed(2)),
      confidenceLower: parseFloat(Math.max(0, blendedPrediction - confidenceWidth).toFixed(2)),
      indicators: indicatorBreakdown,
      modelMetrics: {
        r2Score: parseFloat(r2Score.toFixed(4)),
        maeRupees: parseFloat(maeRupees.toFixed(2)),
        modelVersion: this.modelVersion
      },
      features, // for debugging / shadow comparison
      signals
    };
  }

  /** R² score helper */
  _r2Score(actual, predicted) {
    const meanActual = ss.mean(actual);
    const ssRes = actual.reduce((sum, y, i) => sum + Math.pow(y - predicted[i], 2), 0);
    const ssTot = actual.reduce((sum, y) => sum + Math.pow(y - meanActual, 2), 0);
    if (ssTot === 0) return 0;
    return 1 - (ssRes / ssTot);
  }

  /** Build human-readable indicator breakdown */
  _buildIndicatorBreakdown(features, signals) {
    // RSI interpretation
    let rsiSignal = 'NEUTRAL';
    if (features.rsi14 < 30) rsiSignal = 'BULLISH'; // oversold
    else if (features.rsi14 > 70) rsiSignal = 'BEARISH'; // overbought

    // MACD interpretation
    let macdSignal = 'NEUTRAL';
    if (features.macdNorm > 0 && features.macdNorm > features.macdSignalNorm) {
      macdSignal = 'BULLISH';
    } else if (features.macdNorm < 0) {
      macdSignal = 'BEARISH';
    }

    // SMA position
    let smaPosition = 'AT_SMA';
    if (features.priceToSma7 > 0.01) smaPosition = 'ABOVE_SMA';
    else if (features.priceToSma7 < -0.01) smaPosition = 'BELOW_SMA';

    // Volatility classification
    let volatility = 'MEDIUM';
    if (features.vol10 < 0.01) volatility = 'LOW';
    else if (features.vol10 > 0.025) volatility = 'HIGH';

    // Trend strength
    let trendStrength = 'NEUTRAL';
    if (features.return5d > 0.03) trendStrength = 'STRONG_UP';
    else if (features.return5d > 0.01) trendStrength = 'WEAK_UP';
    else if (features.return5d < -0.03) trendStrength = 'STRONG_DOWN';
    else if (features.return5d < -0.01) trendStrength = 'WEAK_DOWN';

    // Bollinger position
    let bollingerPosition = 'MIDDLE';
    if (features.bollingerB > 0.8) bollingerPosition = 'UPPER';
    else if (features.bollingerB < 0.2) bollingerPosition = 'LOWER';

    // Human-readable explanation
    const explanationParts = [];
    if (trendStrength.includes('UP')) {
      explanationParts.push('The stock shows an upward trend over the past 5 days');
    } else if (trendStrength.includes('DOWN')) {
      explanationParts.push('The stock shows a downward trend over the past 5 days');
    } else {
      explanationParts.push('The stock is trading sideways with no clear trend');
    }

    if (rsiSignal === 'BULLISH') {
      explanationParts.push('RSI indicates the stock is oversold — a bounce may occur');
    } else if (rsiSignal === 'BEARISH') {
      explanationParts.push('RSI indicates the stock is overbought — a pullback is possible');
    }

    if (macdSignal === 'BULLISH') {
      explanationParts.push('MACD shows positive momentum');
    } else if (macdSignal === 'BEARISH') {
      explanationParts.push('MACD shows weakening momentum');
    }

    if (smaPosition === 'ABOVE_SMA') {
      explanationParts.push('Price is above its 7-day moving average, suggesting short-term strength');
    } else if (smaPosition === 'BELOW_SMA') {
      explanationParts.push('Price is below its 7-day moving average, suggesting short-term weakness');
    }

    return {
      rsi14: parseFloat(features.rsi14.toFixed(2)),
      macdSignal,
      smaPosition,
      volatility,
      trendStrength,
      bollingerPosition,
      explanation: explanationParts.join('. ') + '.'
    };
  }

  // ────────────────────────────────────────────────
  //  DAILY PREDICTION GENERATION (called by cron)
  // ────────────────────────────────────────────────

  async generateDailyPredictions() {
    if (!this.isEnabled()) {
      console.log('⏭️ Prediction feature is disabled via feature flag');
      return [];
    }

    console.log('🔮 Starting daily prediction generation...');
    const startTime = Date.now();
    const results = [];

    // Calculate next trading day
    const nextTradingDay = this._getNextTradingDay();

    for (const [symbol, info] of Object.entries(this.stocks)) {
      try {
        // Check if we already generated a prediction for this date
        const existing = await PredictionData.findOne({
          instrumentKey: info.instrumentKey,
          predictionDate: nextTradingDay
        });
        if (existing) {
          console.log(`⏭️ Prediction for ${symbol} on ${nextTradingDay.toISOString().split('T')[0]} already exists`);
          results.push(existing);
          continue;
        }

        // Get cached historical data from MongoDB (3-month daily candles)
        let candles = await this._getCachedCandles(symbol);

        if (!candles || candles.length < 20) {
          // Fallback: try fetching fresh data
          console.log(`⚠️ Insufficient cached candles for ${symbol}, attempting fresh fetch...`);
          try {
            await HistoricalDataService.getHistoricalData(symbol, '3M');
            candles = await this._getCachedCandles(symbol);
          } catch (fetchErr) {
            console.error(`❌ Failed to fetch fresh data for ${symbol}:`, fetchErr.message);
          }
        }

        if (!candles || candles.length < 20) {
          console.error(`❌ Cannot generate prediction for ${symbol}: insufficient data (${candles?.length || 0} candles)`);
          // Store an UNAVAILABLE prediction
          const unavailable = new PredictionData({
            instrumentKey: info.instrumentKey,
            symbol,
            companyName: info.companyName,
            predictionDate: nextTradingDay,
            predictedPrice: 0,
            status: 'UNAVAILABLE'
          });
          await unavailable.save();
          continue;
        }

        // Run prediction
        const prediction = this.predictNextDay(candles);

        if (!prediction) {
          console.error(`❌ Prediction engine returned null for ${symbol}`);
          continue;
        }

        // Store in MongoDB
        const predDoc = new PredictionData({
          instrumentKey: info.instrumentKey,
          symbol,
          companyName: info.companyName,
          predictionDate: nextTradingDay,
          predictedPrice: prediction.predictedPrice,
          confidenceUpper: prediction.confidenceUpper,
          confidenceLower: prediction.confidenceLower,
          indicators: prediction.indicators,
          modelMetrics: prediction.modelMetrics,
          status: 'PENDING'
        });
        await predDoc.save();

        console.log(`✅ ${symbol}: Predicted ₹${prediction.predictedPrice} [₹${prediction.confidenceLower} – ₹${prediction.confidenceUpper}] | R²=${prediction.modelMetrics.r2Score} MAE=₹${prediction.modelMetrics.maeRupees}`);
        results.push(predDoc);

      } catch (error) {
        console.error(`❌ Error generating prediction for ${symbol}:`, error.message);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`🔮 Prediction generation complete: ${results.length}/${Object.keys(this.stocks).length} stocks in ${elapsed}s`);
    return results;
  }

  // ────────────────────────────────────────────────
  //  DAILY EVALUATION (called next morning by cron)
  // ────────────────────────────────────────────────

  async evaluatePredictions() {
    if (!this.isEnabled()) return;

    console.log('📊 Starting prediction evaluation...');
    const StockPrice = require('../models/StockPrice');

    // Find all PENDING predictions where predictionDate is today or earlier
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingPredictions = await PredictionData.find({
      status: 'PENDING',
      predictionDate: { $lte: today }
    });

    if (pendingPredictions.length === 0) {
      console.log('📊 No pending predictions to evaluate');
      return;
    }

    for (const pred of pendingPredictions) {
      try {
        // Get the actual closing price from StockPrice model
        const stock = await StockPrice.findOne({
          instrumentKey: pred.instrumentKey,
          isActive: true
        });

        if (!stock || !stock.currentPrice || stock.currentPrice <= 0) {
          console.warn(`⚠️ No actual price found for ${pred.symbol}, skipping evaluation`);
          continue;
        }

        const actualPrice = stock.currentPrice;
        const accuracy = Math.abs((actualPrice - pred.predictedPrice) / actualPrice) * 100;

        // Update prediction document
        pred.actualPrice = actualPrice;
        pred.accuracy = parseFloat(accuracy.toFixed(2));
        pred.status = 'EVALUATED';
        await pred.save();

        console.log(`📊 ${pred.symbol}: Predicted ₹${pred.predictedPrice} vs Actual ₹${actualPrice} | Error: ${accuracy.toFixed(2)}%`);

        // Evaluate all user predictions for this stock+date
        await this._evaluateUserPredictions(pred);

      } catch (error) {
        console.error(`❌ Error evaluating prediction for ${pred.symbol}:`, error.message);
      }
    }

    console.log('📊 Prediction evaluation complete');
  }

  /** Evaluate user predictions and award XP */
  async _evaluateUserPredictions(predictionData) {
    const userPreds = await UserPrediction.find({
      instrumentKey: predictionData.instrumentKey,
      predictionDate: predictionData.predictionDate,
      status: 'PENDING'
    });

    for (const up of userPreds) {
      try {
        const actualPrice = predictionData.actualPrice;
        const userError = Math.abs((actualPrice - up.userPredictedPrice) / actualPrice) * 100;
        const aiError = predictionData.accuracy;

        up.actualPrice = actualPrice;
        up.userAccuracy = parseFloat(userError.toFixed(2));
        up.aiAccuracy = parseFloat(aiError.toFixed(2));
        up.userBeatAI = userError < aiError;
        up.status = 'EVALUATED';

        // XP calculation
        let xp = 5; // participation XP
        if (userError <= 1) {
          xp = 50; // Within ±1%: Sniper level
        } else if (userError <= 2) {
          xp = 30; // Within ±2%: Great
        } else if (userError <= 5) {
          xp = 15; // Within ±5%: Good
        } else if (userError <= 10) {
          xp = 10; // Within ±10%: OK
        }

        // Beat the AI bonus
        if (up.userBeatAI) {
          xp += 25;
        }

        up.xpEarned = xp;
        await up.save();

        // Award XP to the user
        try {
          const user = await User.findById(up.userId);
          if (user) {
            await user.addExperiencePoints(xp, `Prediction challenge: ${predictionData.symbol}`);
            await user.save();
          }
        } catch (xpError) {
          console.warn(`⚠️ Failed to award XP to user ${up.userId}:`, xpError.message);
        }

        console.log(`  👤 User ${up.userId}: Error ${userError.toFixed(2)}% | Beat AI: ${up.userBeatAI} | +${xp} XP`);

      } catch (error) {
        console.error(`❌ Error evaluating user prediction:`, error.message);
      }
    }
  }

  // ────────────────────────────────────────────────
  //  API HELPERS
  // ────────────────────────────────────────────────

  /** Get today's/tomorrow's predictions */
  async getLatestPredictions() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const predictions = await PredictionData.find({
      predictionDate: { $gte: today },
      status: { $ne: 'UNAVAILABLE' }
    }).sort({ predictionDate: 1 }).lean();

    // If no future predictions exist, return the most recent ones
    if (predictions.length === 0) {
      return await PredictionData.find({
        status: { $ne: 'UNAVAILABLE' }
      }).sort({ predictionDate: -1 }).limit(4).lean();
    }

    return predictions;
  }

  /** Get historical prediction accuracy */
  async getPredictionHistory(instrumentKey, days = 30) {
    return await PredictionData.getHistory(instrumentKey, days);
  }

  /** Get indicator breakdown for a stock (current) */
  async getStockIndicators(instrumentKey) {
    // Find symbol from instrumentKey
    let symbol = null;
    for (const [sym, info] of Object.entries(this.stocks)) {
      if (info.instrumentKey === instrumentKey) {
        symbol = sym;
        break;
      }
    }
    if (!symbol) return null;

    const candles = await this._getCachedCandles(symbol);
    if (!candles || candles.length < 20) return null;

    const features = this.buildFeatures(candles);
    return this._buildIndicatorBreakdown(features, []);
  }

  /** Submit a user prediction */
  async submitUserPrediction(userId, instrumentKey, userPredictedPrice) {
    // Find the AI prediction for this stock
    const nextTradingDay = this._getNextTradingDay();
    const aiPrediction = await PredictionData.findOne({
      instrumentKey,
      predictionDate: nextTradingDay,
      status: 'PENDING'
    });

    if (!aiPrediction) {
      throw new Error('No AI prediction available for this stock. Predictions are generated after market close.');
    }

    // Find symbol
    let symbol = '';
    for (const [sym, info] of Object.entries(this.stocks)) {
      if (info.instrumentKey === instrumentKey) {
        symbol = sym;
        break;
      }
    }

    // Check if user already predicted for this stock+date
    const existing = await UserPrediction.findOne({
      userId,
      instrumentKey,
      predictionDate: nextTradingDay
    });
    if (existing) {
      // Update the existing prediction instead
      existing.userPredictedPrice = userPredictedPrice;
      existing.aiPredictedPrice = aiPrediction.predictedPrice;
      existing.submittedAt = new Date();
      await existing.save();
      return existing;
    }

    const userPred = new UserPrediction({
      userId,
      instrumentKey,
      symbol,
      predictionDate: nextTradingDay,
      userPredictedPrice,
      aiPredictedPrice: aiPrediction.predictedPrice
    });
    await userPred.save();

    // Award participation XP (5 XP per prediction submitted)
    try {
      const user = await User.findById(userId);
      if (user) {
        await user.addExperiencePoints(5, `Submitted prediction for ${symbol}`);
        await user.save();
      }
    } catch (e) {
      console.warn('⚠️ Failed to award participation XP:', e.message);
    }

    return userPred;
  }

  /** Get leaderboard */
  async getLeaderboard(limit = 20) {
    return await UserPrediction.getLeaderboard(limit);
  }

  /** Get user's prediction history */
  async getUserHistory(userId, limit = 30) {
    return await UserPrediction.getUserHistory(userId, limit);
  }

  /** Get user's current streak */
  async getUserStreak(userId) {
    return await UserPrediction.getUserStreak(userId);
  }

  // ────────────────────────────────────────────────
  //  INTERNAL HELPERS
  // ────────────────────────────────────────────────

  /** Get candles from the HistoricalCandle MongoDB cache */
  async _getCachedCandles(symbol) {
    // Look for the most recent daily candle data for this symbol
    const cached = await HistoricalCandle.findOne({
      symbol,
      unit: 'days'
    }).sort({ lastUpdated: -1 });

    if (!cached || !cached.candles || cached.candles.length === 0) {
      return null;
    }

    // Sort candles by timestamp ascending
    const sorted = [...cached.candles].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    return sorted;
  }

  /** Get the next trading day (skipping weekends) */
  _getNextTradingDay() {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const nextDay = new Date(istTime);

    // If before market close (3:30 PM IST), prediction is for today
    // If after market close, prediction is for next trading day
    const hour = istTime.getHours();
    const minute = istTime.getMinutes();
    const afterClose = hour > 15 || (hour === 15 && minute > 30);

    if (afterClose) {
      nextDay.setDate(nextDay.getDate() + 1);
    }

    // Skip weekends
    while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
      nextDay.setDate(nextDay.getDate() + 1);
    }

    nextDay.setHours(0, 0, 0, 0);
    return nextDay;
  }

  // ────────────────────────────────────────────────
  //  BACKTESTING (admin / shadow comparison)
  // ────────────────────────────────────────────────

  /** Run backtesting on historical data and return metrics */
  async runBacktest(symbol, testDays = 20) {
    const candles = await this._getCachedCandles(symbol);
    if (!candles || candles.length < testDays + 30) {
      return { error: 'Insufficient data for backtesting', candleCount: candles?.length || 0 };
    }

    const actuals = [];
    const predictions = [];

    for (let i = 30; i < candles.length - 1 && actuals.length < testDays; i++) {
      const trainCandles = candles.slice(0, i + 1);
      const result = this.predictNextDay(trainCandles);
      if (result) {
        predictions.push(result.predictedPrice);
        actuals.push(candles[i + 1].close);
      }
    }

    if (actuals.length === 0) {
      return { error: 'Could not generate any predictions in backtest' };
    }

    const errors = actuals.map((a, i) => Math.abs((a - predictions[i]) / a) * 100);
    const absErrors = actuals.map((a, i) => Math.abs(a - predictions[i]));

    return {
      symbol,
      testDays: actuals.length,
      r2Score: parseFloat(this._r2Score(actuals, predictions).toFixed(4)),
      maeRupees: parseFloat(ss.mean(absErrors).toFixed(2)),
      maePercent: parseFloat(ss.mean(errors).toFixed(2)),
      medianErrorPercent: parseFloat(ss.median(errors).toFixed(2)),
      maxErrorPercent: parseFloat(Math.max(...errors).toFixed(2)),
      within1Percent: errors.filter(e => e <= 1).length,
      within2Percent: errors.filter(e => e <= 2).length,
      within5Percent: errors.filter(e => e <= 5).length,
      modelVersion: this.modelVersion
    };
  }
}

module.exports = new PredictionService();
