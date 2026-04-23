const mongoose = require('mongoose');

/**
 * PredictionData — stores ML-generated stock price predictions.
 * One document per stock per prediction date.
 * Generated daily after market close; actualPrice filled next trading day.
 */
const predictionDataSchema = new mongoose.Schema({
  instrumentKey: {
    type: String,
    required: true,
    trim: true
  },
  symbol: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  companyName: {
    type: String,
    trim: true
  },

  // The date this prediction is FOR (next trading day)
  predictionDate: {
    type: Date,
    required: true
  },

  // When the prediction was generated
  generatedAt: {
    type: Date,
    default: Date.now
  },

  // ML predicted closing price
  predictedPrice: {
    type: Number,
    required: true,
    min: 0
  },

  // Confidence bands
  confidenceUpper: {
    type: Number,
    min: 0
  },
  confidenceLower: {
    type: Number,
    min: 0
  },

  // Filled in after market close on predictionDate
  actualPrice: {
    type: Number,
    default: null
  },

  // Absolute percentage error (filled after actual known)
  accuracy: {
    type: Number,
    default: null
  },

  // Educational indicator breakdown
  indicators: {
    rsi14: { type: Number, default: null },
    macdSignal: {
      type: String,
      enum: ['BULLISH', 'BEARISH', 'NEUTRAL'],
      default: 'NEUTRAL'
    },
    smaPosition: {
      type: String,
      enum: ['ABOVE_SMA', 'BELOW_SMA', 'AT_SMA'],
      default: 'AT_SMA'
    },
    volatility: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM'
    },
    trendStrength: {
      type: String,
      enum: ['STRONG_UP', 'WEAK_UP', 'NEUTRAL', 'WEAK_DOWN', 'STRONG_DOWN'],
      default: 'NEUTRAL'
    },
    bollingerPosition: {
      type: String,
      enum: ['UPPER', 'MIDDLE', 'LOWER'],
      default: 'MIDDLE'
    },
    // Human-readable explanation of WHY
    explanation: {
      type: String,
      default: ''
    }
  },

  // Model performance metrics for this prediction batch
  modelMetrics: {
    r2Score: { type: Number, default: null },
    maeRupees: { type: Number, default: null },
    modelVersion: { type: String, default: 'v1.0-node-lr' }
  },

  // Feature flag / status
  status: {
    type: String,
    enum: ['PENDING', 'EVALUATED', 'UNAVAILABLE'],
    default: 'PENDING'
  }
}, {
  timestamps: true
});

// Compound index for fast lookups
predictionDataSchema.index({ instrumentKey: 1, predictionDate: -1 });
predictionDataSchema.index({ predictionDate: -1 });
predictionDataSchema.index({ status: 1 });

// TTL index: auto-delete predictions older than 180 days
predictionDataSchema.index({ predictionDate: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });

// Get latest predictions (today/tomorrow)
predictionDataSchema.statics.getLatestPredictions = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return this.find({ predictionDate: { $gte: today } })
    .sort({ predictionDate: 1 })
    .lean();
};

// Get prediction history for a stock
predictionDataSchema.statics.getHistory = function (instrumentKey, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return this.find({
    instrumentKey,
    predictionDate: { $gte: since }
  }).sort({ predictionDate: 1 }).lean();
};

const PredictionData = mongoose.model('PredictionData', predictionDataSchema);

module.exports = PredictionData;
