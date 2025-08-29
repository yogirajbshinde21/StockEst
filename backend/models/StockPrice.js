const mongoose = require('mongoose');

// Schema to store real-time stock prices
const stockPriceSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  instrumentKey: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  currentPrice: {
    type: Number,
    required: true,
    min: 0
  },
  previousClose: {
    type: Number,
    default: 0,
    min: 0
  },
  change: {
    type: Number,
    default: 0
  },
  changePercent: {
    type: Number,
    default: 0
  },
  dayHigh: {
    type: Number,
    default: 0,
    min: 0
  },
  dayLow: {
    type: Number,
    default: 0,
    min: 0
  },
  volume: {
    type: Number,
    default: 0,
    min: 0
  },
  marketCap: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Price history for charts (last 100 updates)
  priceHistory: [{
    price: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Market status
  marketStatus: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'PRE_OPEN', 'POST_CLOSE'],
    default: 'CLOSED'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
stockPriceSchema.index({ instrumentKey: 1 });
stockPriceSchema.index({ symbol: 1 });
stockPriceSchema.index({ lastUpdated: -1 });
stockPriceSchema.index({ isActive: 1 });

// Method to add price to history
stockPriceSchema.methods.addPriceToHistory = function(price) {
  this.priceHistory.push({
    price: price,
    timestamp: new Date()
  });
  
  // Keep only last 100 entries for performance
  if (this.priceHistory.length > 100) {
    this.priceHistory = this.priceHistory.slice(-100);
  }
};

// Method to calculate change and change percent
stockPriceSchema.methods.calculateChange = function() {
  if (this.previousClose && this.previousClose > 0) {
    this.change = this.currentPrice - this.previousClose;
    this.changePercent = ((this.change / this.previousClose) * 100);
  }
};

// Static method to get all active stocks
stockPriceSchema.statics.getActiveStocks = function() {
  return this.find({ isActive: true }).sort({ symbol: 1 });
};

// Static method to get stocks with latest prices
stockPriceSchema.statics.getLatestPrices = function() {
  return this.find({ isActive: true })
    .select('symbol instrumentKey companyName currentPrice change changePercent lastUpdated marketStatus')
    .sort({ symbol: 1 });
};

// Static method to bulk update prices
stockPriceSchema.statics.bulkUpdatePrices = async function(priceUpdates) {
  const bulkOps = priceUpdates.map(update => ({
    updateOne: {
      filter: { instrumentKey: update.instrumentKey },
      update: {
        $set: {
          currentPrice: update.currentPrice,
          previousClose: update.previousClose || 0,
          change: update.change || 0,
          changePercent: update.changePercent || 0,
          dayHigh: update.dayHigh || 0,
          dayLow: update.dayLow || 0,
          volume: update.volume || 0,
          lastUpdated: new Date(),
          marketStatus: update.marketStatus || 'OPEN'
        },
        $push: {
          priceHistory: {
            $each: [{
              price: update.currentPrice,
              timestamp: new Date()
            }],
            $slice: -100 // Keep only last 100 entries
          }
        }
      }
    }
  }));
  
  if (bulkOps.length > 0) {
    const result = await this.bulkWrite(bulkOps);
    console.log(`✅ Updated ${result.modifiedCount} stock prices in database`);
    return result;
  }
};

// Pre-save middleware to update change calculations
stockPriceSchema.pre('save', function(next) {
  this.calculateChange();
  this.lastUpdated = new Date();
  next();
});

const StockPrice = mongoose.model('StockPrice', stockPriceSchema);

module.exports = StockPrice;
