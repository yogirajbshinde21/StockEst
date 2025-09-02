const mongoose = require('mongoose');

// Daily Portfolio Snapshot Schema
const portfolioSnapshotSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  totalValue: {
    type: Number,
    required: true,
    min: 0
  },
  totalInvested: {
    type: Number,
    required: true,
    min: 0
  },
  totalProfitLoss: {
    type: Number,
    required: true
  },
  totalProfitLossPercent: {
    type: Number,
    required: true
  },
  cashBalance: {
    type: Number,
    required: true,
    min: 0
  },
  // Portfolio composition
  holdings: [{
    symbol: String,
    instrumentKey: String,
    quantity: Number,
    currentPrice: Number,
    currentValue: Number,
    profitLoss: Number,
    profitLossPercent: Number,
    weightage: Number // Percentage of total portfolio
  }],
  // Sector allocation
  sectorAllocation: [{
    sector: String,
    value: Number,
    percentage: Number
  }],
  // Performance metrics
  dayChange: {
    type: Number,
    default: 0
  },
  dayChangePercent: {
    type: Number,
    default: 0
  },
  // Milestone tracking
  milestones: [{
    type: {
      type: String,
      enum: ['PROFIT_MILESTONE', 'LOSS_MILESTONE', 'VALUE_MILESTONE', 'INVESTMENT_MILESTONE']
    },
    value: Number,
    description: String,
    achieved: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Performance Milestone Schema
const performanceMilestoneSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'FIRST_INVESTMENT',
      'PROFIT_1K', 'PROFIT_5K', 'PROFIT_10K', 'PROFIT_25K', 'PROFIT_50K', 'PROFIT_100K',
      'LOSS_1K', 'LOSS_5K', 'LOSS_10K',
      'PORTFOLIO_VALUE_100K', 'PORTFOLIO_VALUE_500K', 'PORTFOLIO_VALUE_1M',
      'INVESTMENT_AMOUNT_50K', 'INVESTMENT_AMOUNT_100K', 'INVESTMENT_AMOUNT_500K',
      'DIVERSIFICATION_5_STOCKS', 'DIVERSIFICATION_10_STOCKS', 'DIVERSIFICATION_20_STOCKS',
      'MONTHLY_GAINS', 'QUARTERLY_GAINS', 'YEARLY_GAINS',
      'BEST_PERFORMING_STOCK', 'WORST_PERFORMING_STOCK'
    ],
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  achievedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    stockSymbol: String,
    timeframe: String,
    percentage: Number,
    additionalInfo: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Portfolio Analytics Summary Schema
const portfolioAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // Performance metrics
  performance: {
    totalReturn: Number,
    totalReturnPercent: Number,
    annualizedReturn: Number,
    volatility: Number,
    sharpeRatio: Number,
    maxDrawdown: Number,
    bestDay: {
      date: Date,
      value: Number,
      percent: Number
    },
    worstDay: {
      date: Date,
      value: Number,
      percent: Number
    }
  },
  // Time-based returns
  returns: {
    oneDay: Number,
    oneWeek: Number,
    oneMonth: Number,
    threeMonths: Number,
    sixMonths: Number,
    oneYear: Number,
    allTime: Number
  },
  // Top performers
  topGainers: [{
    symbol: String,
    profitLoss: Number,
    profitLossPercent: Number,
    currentValue: Number
  }],
  topLosers: [{
    symbol: String,
    profitLoss: Number,
    profitLossPercent: Number,
    currentValue: Number
  }],
  // Sector analysis
  sectorPerformance: [{
    sector: String,
    allocation: Number,
    profitLoss: Number,
    profitLossPercent: Number,
    topStock: String
  }],
  // Risk metrics
  riskMetrics: {
    portfolioConcentration: Number, // 0-1, higher means more concentrated
    diversificationScore: Number, // 0-100, higher is better
    avgHoldingPeriod: Number, // Days
    turnoverRatio: Number
  }
}, {
  timestamps: true
});

// Create indexes for better performance
portfolioSnapshotSchema.index({ userId: 1, date: -1 });
performanceMilestoneSchema.index({ userId: 1, type: 1 });
portfolioAnalyticsSchema.index({ userId: 1 });

const PortfolioSnapshot = mongoose.model('PortfolioSnapshot', portfolioSnapshotSchema);
const PerformanceMilestone = mongoose.model('PerformanceMilestone', performanceMilestoneSchema);
const PortfolioAnalytics = mongoose.model('PortfolioAnalytics', portfolioAnalyticsSchema);

module.exports = {
  PortfolioSnapshot,
  PerformanceMilestone,
  PortfolioAnalytics
};
