const mongoose = require('mongoose');

/**
 * News Schema for storing financial news from Perplexity API
 * Designed for rural education with simple explanations
 */
const newsSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  publishedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  category: {
    type: String,
    enum: ['stock-market', 'company-news', 'market-analysis', 'general'],
    default: 'stock-market'
  },
  affectedStocks: [{
    symbol: {
      type: String,
      required: true,
      enum: ['RELIANCE', 'INFY', 'TCS', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'WIPRO', 'ITC', 'BHARTIARTL', 'KOTAKBANK']
    },
    impact: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral'
    },
    explanation: {
      type: String,
      maxlength: 200
    }
  }],
  source: {
    type: String,
    default: 'Perplexity AI'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  fetchedAt: {
    type: Date,
    default: Date.now
  },
  language: {
    type: String,
    default: 'hindi-english-mix'
  }
}, {
  timestamps: true,
  collection: 'news'
});

// Index for better query performance
newsSchema.index({ publishedAt: -1 });
newsSchema.index({ affectedStocks: 1 });
newsSchema.index({ isActive: 1 });
newsSchema.index({ fetchedAt: -1 });

// Static method to get latest news
newsSchema.statics.getLatestNews = function(limit = 10) {
  console.log(`📰 Fetching ${limit} latest news articles`);
  return this.find({ isActive: true })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get news for specific stock
newsSchema.statics.getNewsForStock = function(symbol, limit = 5) {
  console.log(`📈 Fetching news for stock: ${symbol}`);
  return this.find({ 
    isActive: true,
    'affectedStocks.symbol': symbol 
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to clean old news (older than 7 days)
newsSchema.statics.cleanOldNews = function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  console.log(`🧹 Cleaning news older than ${sevenDaysAgo.toISOString()}`);
  return this.updateMany(
    { publishedAt: { $lt: sevenDaysAgo } },
    { $set: { isActive: false } }
  );
};

// Instance method to check if news affects user's portfolio
newsSchema.methods.affectsUserStocks = function(userStocks) {
  const userSymbols = userStocks.map(stock => stock.symbol);
  const newsSymbols = this.affectedStocks.map(stock => stock.symbol);
  return newsSymbols.some(symbol => userSymbols.includes(symbol));
};

// Pre-save middleware for validation
newsSchema.pre('save', function(next) {
  // Ensure content is not too long
  if (this.content && this.content.length > 2000) {
    this.content = this.content.substring(0, 1997) + '...';
  }
  
  // Set publishedAt to now if not provided
  if (!this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  console.log(`💾 Saving news article: ${this.content.substring(0, 50)}...`);
  next();
});

const News = mongoose.model('News', newsSchema);

module.exports = News;
