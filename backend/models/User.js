const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Portfolio item schema for individual stock holdings
const portfolioItemSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true
  },
  instrumentKey: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  averagePrice: {
    type: Number,
    required: true,
    min: 0
  },
  currentPrice: {
    type: Number,
    default: 0
  },
  totalInvested: {
    type: Number,
    required: true
  },
  currentValue: {
    type: Number,
    default: 0
  },
  profitLoss: {
    type: Number,
    default: 0
  },
  profitLossPercent: {
    type: Number,
    default: 0
  }
});

// Transaction schema for buy/sell history
const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  instrumentKey: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  profitLoss: {
    type: Number,
    default: 0
  },
  profitLossPercent: {
    type: Number,
    default: 0
  },
  originalInvestment: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Watchlist item schema for tracking stocks
const watchlistItemSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true
  },
  instrumentKey: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  alertPrice: {
    type: Number,
    default: null // Price at which user wants to be alerted
  },
  alertEnabled: {
    type: Boolean,
    default: false
  }
});

// Main User schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  virtualBalance: {
    type: Number,
    default: 100000, // Starting balance: ₹1,00,000
    min: [0, 'Balance cannot be negative']
  },
  totalInvested: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPortfolioValue: {
    type: Number,
    default: 0,
    min: 0
  },
  totalProfitLoss: {
    type: Number,
    default: 0
  },
  totalProfitLossPercent: {
    type: Number,
    default: 0
  },
  portfolio: [portfolioItemSchema],
  transactions: [transactionSchema],
  watchlist: [watchlistItemSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  // Gamification System
  achievements: [{
    achievementId: {
      type: String,
      required: true
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0
    },
    isNotified: {
      type: Boolean,
      default: false
    }
  }],
  
  loginStreak: {
    current: {
      type: Number,
      default: 0
    },
    best: {
      type: Number,
      default: 0
    },
    lastLoginDate: {
      type: Date
    }
  },
  
  stats: {
    totalTrades: {
      type: Number,
      default: 0
    },
    totalProfit: {
      type: Number,
      default: 0
    },
    experiencePoints: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: 1
    },
    badges: [{
      type: String
    }]
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ 'portfolio.symbol': 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to update portfolio values
userSchema.methods.updatePortfolioValues = function(stockPrices) {
  let totalPortfolioValue = 0;
  let totalInvested = 0;
  
  this.portfolio.forEach(item => {
    // Find current price from the stockPrices object
    const currentPrice = stockPrices[item.instrumentKey] || item.currentPrice || 0;
    item.currentPrice = currentPrice;
    item.currentValue = item.quantity * currentPrice;
    item.profitLoss = item.currentValue - item.totalInvested;
    item.profitLossPercent = item.totalInvested > 0 
      ? ((item.profitLoss / item.totalInvested) * 100) 
      : 0;
    
    totalPortfolioValue += item.currentValue;
    totalInvested += item.totalInvested;
  });
  
  this.totalPortfolioValue = totalPortfolioValue;
  this.totalInvested = totalInvested;
  this.totalProfitLoss = totalPortfolioValue - totalInvested;
  this.totalProfitLossPercent = totalInvested > 0 
    ? ((this.totalProfitLoss / totalInvested) * 100) 
    : 0;
};

// Method to get user's total balance (cash + portfolio value)
userSchema.methods.getTotalBalance = function() {
  return this.virtualBalance + this.totalPortfolioValue;
};

// Gamification Methods
userSchema.methods.addExperiencePoints = function(points, reason) {
  this.stats.experiencePoints += points;
  
  // Calculate level (100 XP per level)
  const newLevel = Math.floor(this.stats.experiencePoints / 100) + 1;
  if (newLevel > this.stats.level) {
    this.stats.level = newLevel;
    console.log(`🎉 ${this.name} leveled up to Level ${newLevel}!`);
    return { leveledUp: true, newLevel };
  }
  
  console.log(`🎯 ${this.name} earned ${points} XP for: ${reason}`);
  return { leveledUp: false, newLevel: this.stats.level };
};

userSchema.methods.updateLoginStreak = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastLogin = this.loginStreak.lastLoginDate;
  
  if (!lastLogin) {
    // First login
    this.loginStreak.current = 1;
    this.loginStreak.lastLoginDate = today;
    this.loginStreak.best = 1;
    return { streak: 1, bonus: 100 };
  }
  
  const lastLoginDate = new Date(lastLogin);
  lastLoginDate.setHours(0, 0, 0, 0);
  
  const timeDiff = today.getTime() - lastLoginDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
  
  if (daysDiff === 0) {
    // Same day, no streak update
    return { streak: this.loginStreak.current, bonus: 0 };
  } else if (daysDiff === 1) {
    // Consecutive day
    this.loginStreak.current += 1;
    this.loginStreak.lastLoginDate = today;
    this.loginStreak.best = Math.max(this.loginStreak.best, this.loginStreak.current);
    
    // Calculate bonus: ₹100 + ₹50 per day up to ₹500
    const bonus = Math.min(100 + (this.loginStreak.current - 1) * 50, 500);
    this.virtualBalance += bonus;
    
    return { streak: this.loginStreak.current, bonus };
  } else {
    // Streak broken
    this.loginStreak.current = 1;
    this.loginStreak.lastLoginDate = today;
    return { streak: 1, bonus: 100 };
  }
};

userSchema.methods.updateTradingStats = function(type, amount, profit = 0) {
  this.stats.totalTrades += 1;
  
  if (profit > 0) {
    this.stats.totalProfit += profit;
  }
  
  // Award XP for trading
  const xpEarned = type === 'BUY' ? 5 : 10; // More XP for sells
  return this.addExperiencePoints(xpEarned, `${type} trade`);
};

userSchema.methods.hasAchievement = function(achievementId) {
  return this.achievements.some(achievement => achievement.achievementId === achievementId);
};

userSchema.methods.addAchievement = function(achievementId, progress = 100) {
  if (!this.hasAchievement(achievementId)) {
    this.achievements.push({
      achievementId,
      progress,
      unlockedAt: new Date(),
      isNotified: false
    });
    return true;
  }
  return false;
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
