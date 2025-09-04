const mongoose = require('mongoose');

// Historical Scenario Schema for storing market event impact data
const historicalScenarioSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  eventDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ['MARKET_CRASH', 'RECESSION', 'BUBBLE_BURST', 'CRISIS', 'RECOVERY'],
    required: true
  },
  
  // Sector-wise impact percentages
  sectorImpacts: [{
    sector: {
      type: String,
      required: true
    },
    impactPercentage: {
      type: Number,
      required: true,
      min: -100,
      max: 500 // Allow for growth scenarios too
    },
    description: String
  }],
  
  // Stock-specific impact percentages (for major stocks)
  stockImpacts: [{
    symbol: {
      type: String,
      required: true
    },
    instrumentKey: {
      type: String,
      required: true
    },
    impactPercentage: {
      type: Number,
      required: true,
      min: -100,
      max: 500
    },
    sectorOverride: {
      type: Boolean,
      default: false // If true, use this instead of sector impact
    }
  }],
  
  // Overall market impact
  marketImpact: {
    overallMarketChange: {
      type: Number,
      required: true,
      min: -100,
      max: 500
    },
    volatilityIncrease: {
      type: Number,
      default: 0,
      min: 0,
      max: 1000
    },
    duration: {
      type: String,
      enum: ['1_DAY', '1_WEEK', '1_MONTH', '3_MONTHS', '6_MONTHS', '1_YEAR'],
      default: '1_MONTH'
    }
  },
  
  // Gemini calculation metadata
  geminiCalculated: {
    type: Boolean,
    default: false,
    required: true
  },
  calculatedAt: {
    type: Date
  },
  calculatedBy: {
    type: String,
    default: 'GEMINI_AI'
  },
  
  // Historical data sources and confidence
  dataSources: [{
    source: String,
    reliability: {
      type: Number,
      min: 0,
      max: 1
    }
  }],
  
  // Usage statistics
  usageStats: {
    timesUsed: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date
    },
    uniqueUsers: {
      type: Number,
      default: 0
    }
  },
  
  // Additional metadata
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for better query performance
historicalScenarioSchema.index({ eventName: 1 });
historicalScenarioSchema.index({ eventType: 1 });
historicalScenarioSchema.index({ geminiCalculated: 1 });
historicalScenarioSchema.index({ isActive: 1 });
historicalScenarioSchema.index({ 'sectorImpacts.sector': 1 });
historicalScenarioSchema.index({ 'stockImpacts.symbol': 1 });

// Method to increment usage statistics
historicalScenarioSchema.methods.incrementUsage = function(isNewUser = false) {
  this.usageStats.timesUsed += 1;
  this.usageStats.lastUsed = new Date();
  if (isNewUser) {
    this.usageStats.uniqueUsers += 1;
  }
};

// Method to get impact for a specific stock
historicalScenarioSchema.methods.getStockImpact = function(symbol, sector = null) {
  // First check for stock-specific impact
  const stockImpact = this.stockImpacts.find(impact => impact.symbol === symbol);
  if (stockImpact && stockImpact.sectorOverride) {
    return stockImpact.impactPercentage;
  }
  
  // If no stock-specific impact or not overriding, use sector impact
  if (sector) {
    const sectorImpact = this.sectorImpacts.find(impact => impact.sector === sector);
    if (sectorImpact) {
      return sectorImpact.impactPercentage;
    }
  }
  
  // If stock-specific exists but not overriding sector, combine them
  if (stockImpact && sector) {
    const sectorImpact = this.sectorImpacts.find(impact => impact.sector === sector);
    if (sectorImpact) {
      // Average the two impacts
      return (stockImpact.impactPercentage + sectorImpact.impactPercentage) / 2;
    }
    return stockImpact.impactPercentage;
  }
  
  // Fallback to overall market impact
  return this.marketImpact.overallMarketChange;
};

// Method to apply scenario to portfolio
historicalScenarioSchema.methods.applyToPortfolio = function(portfolio) {
  return portfolio.map(holding => {
    const impactPercentage = this.getStockImpact(holding.symbol, holding.sector);
    const impactMultiplier = 1 + (impactPercentage / 100);
    
    // Handle different field name patterns from different services
    const totalInvested = holding.totalInvested || holding.investment || 0;
    const currentProfitLoss = holding.profitLoss || holding.pnl || 0;
    const currentProfitLossPercent = holding.profitLossPercent || holding.pnlPercent || 0;
    
    const historicalPrice = holding.currentPrice * impactMultiplier;
    const historicalValue = holding.quantity * historicalPrice;
    const historicalProfitLoss = historicalValue - totalInvested;
    const historicalProfitLossPercent = totalInvested > 0 
      ? ((historicalProfitLoss / totalInvested) * 100) 
      : 0;
    
    return {
      ...holding.toObject ? holding.toObject() : holding,
      // Ensure consistent field names for frontend
      totalInvested,
      profitLoss: currentProfitLoss,
      profitLossPercent: currentProfitLossPercent,
      // Historical scenario data
      historicalPrice,
      historicalValue,
      historicalProfitLoss,
      historicalProfitLossPercent,
      impactPercentage,
      scenarioName: this.eventName
    };
  });
};

// Static method to get predefined scenarios
historicalScenarioSchema.statics.getPredefinedScenarios = function() {
  return [
    {
      eventName: 'COVID_CRASH_2020',
      eventDate: new Date('2020-03-20'),
      description: 'COVID-19 pandemic market crash in March 2020',
      eventType: 'MARKET_CRASH'
    },
    {
      eventName: 'FINANCIAL_CRISIS_2008',
      eventDate: new Date('2008-09-15'),
      description: 'Global Financial Crisis triggered by Lehman Brothers collapse',
      eventType: 'CRISIS'
    },
    {
      eventName: 'DOTCOM_BUBBLE_2000',
      eventDate: new Date('2000-03-10'),
      description: 'Dot-com bubble burst affecting technology stocks',
      eventType: 'BUBBLE_BURST'
    }
  ];
};

const HistoricalScenario = mongoose.model('HistoricalScenario', historicalScenarioSchema);

module.exports = HistoricalScenario;
