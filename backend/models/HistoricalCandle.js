const mongoose = require('mongoose');

// Schema to store historical candle data with caching
const historicalCandleSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  instrumentKey: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    enum: ['minutes', 'hours', 'days', 'weeks', 'months']
  },
  interval: {
    type: String,
    required: true
  },
  fromDate: {
    type: String,
    required: true
  },
  toDate: {
    type: String,
    required: true
  },
  candles: [{
    timestamp: String,      // ISO timestamp
    open: Number,           // Opening price
    high: Number,           // High price
    low: Number,            // Low price
    close: Number,          // Closing price
    volume: Number,         // Trading volume
    openInterest: Number    // Open interest
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // For quick lookups and avoiding duplicates
  dataKey: {
    type: String,
    required: true,
    unique: true,
    // Format: {symbol}_{unit}_{interval}_{fromDate}_{toDate}
  },
  // Market analysis metadata
  analysis: {
    trend: {
      type: String,
      enum: ['UPWARD', 'DOWNWARD', 'SIDEWAYS'],
      default: 'SIDEWAYS'
    },
    volatility: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM'
    },
    gainLoss: {
      percentage: Number,
      amount: Number,
      type: {
        type: String,
        enum: ['GAIN', 'LOSS', 'NEUTRAL'],
        default: 'NEUTRAL'
      }
    },
    lastAnalyzed: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  indexes: [
    { symbol: 1, unit: 1, interval: 1 },
    { dataKey: 1 },
    { lastUpdated: 1 }
  ]
});

// Method to check if data is fresh (updated after market close)
historicalCandleSchema.methods.isFresh = function() {
  const now = new Date();
  const marketCloseTime = new Date();
  marketCloseTime.setHours(15, 30, 0, 0); // 3:30 PM IST
  
  // If current time is before market close, check if updated today
  if (now < marketCloseTime) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.lastUpdated >= today;
  } else {
    // If after market close, check if updated after market close today
    return this.lastUpdated >= marketCloseTime;
  }
};

// Static method to generate data key
historicalCandleSchema.statics.generateDataKey = function(symbol, unit, interval, fromDate, toDate) {
  return `${symbol}_${unit}_${interval}_${fromDate}_${toDate}`;
};

// Method to analyze trend and volatility
historicalCandleSchema.methods.analyzeData = function() {
  if (!this.candles || this.candles.length < 2) {
    return;
  }

  const prices = this.candles.map(candle => candle.close);
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  
  // Calculate gain/loss
  const change = lastPrice - firstPrice;
  const changePercent = (change / firstPrice) * 100;
  
  this.analysis.gainLoss = {
    percentage: changePercent,
    amount: change,
    type: change > 0 ? 'GAIN' : change < 0 ? 'LOSS' : 'NEUTRAL'
  };

  // Determine trend (simple: compare first and last prices + middle trend)
  const midPoint = Math.floor(prices.length / 2);
  const firstHalfAvg = prices.slice(0, midPoint).reduce((a, b) => a + b, 0) / midPoint;
  const secondHalfAvg = prices.slice(midPoint).reduce((a, b) => a + b, 0) / (prices.length - midPoint);
  
  if (secondHalfAvg > firstHalfAvg * 1.02) {
    this.analysis.trend = 'UPWARD';
  } else if (secondHalfAvg < firstHalfAvg * 0.98) {
    this.analysis.trend = 'DOWNWARD';
  } else {
    this.analysis.trend = 'SIDEWAYS';
  }

  // Calculate volatility based on price variations
  let totalVariation = 0;
  for (let i = 0; i < this.candles.length; i++) {
    const candle = this.candles[i];
    const variation = ((candle.high - candle.low) / candle.open) * 100;
    totalVariation += variation;
  }
  const avgVariation = totalVariation / this.candles.length;
  
  if (avgVariation > 3) {
    this.analysis.volatility = 'HIGH';
  } else if (avgVariation > 1.5) {
    this.analysis.volatility = 'MEDIUM';
  } else {
    this.analysis.volatility = 'LOW';
  }

  this.analysis.lastAnalyzed = new Date();
};

const HistoricalCandle = mongoose.model('HistoricalCandle', historicalCandleSchema);

module.exports = HistoricalCandle;
