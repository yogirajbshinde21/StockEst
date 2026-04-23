const mongoose = require('mongoose');

/**
 * UserPrediction — stores each user's prediction challenge entry.
 * Users submit their predicted price for a stock; after market close,
 * accuracy is computed and XP is awarded.
 */
const userPredictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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

  // The date this prediction is for (next trading day)
  predictionDate: {
    type: Date,
    required: true
  },

  // User's predicted closing price
  userPredictedPrice: {
    type: Number,
    required: true,
    min: 0
  },

  // Snapshot of AI's prediction at the time user submitted
  aiPredictedPrice: {
    type: Number,
    required: true,
    min: 0
  },

  // --- Filled after evaluation ---
  actualPrice: {
    type: Number,
    default: null
  },

  // Absolute percentage error for user and AI
  userAccuracy: {
    type: Number,
    default: null
  },
  aiAccuracy: {
    type: Number,
    default: null
  },

  // Did user beat the AI?
  userBeatAI: {
    type: Boolean,
    default: null
  },

  // XP awarded for this prediction
  xpEarned: {
    type: Number,
    default: 0
  },

  // Status
  status: {
    type: String,
    enum: ['PENDING', 'EVALUATED'],
    default: 'PENDING'
  },

  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for fast queries
userPredictionSchema.index({ userId: 1, predictionDate: -1 });
userPredictionSchema.index({ instrumentKey: 1, predictionDate: -1 });
userPredictionSchema.index({ userId: 1, instrumentKey: 1, predictionDate: 1 }, { unique: true });

// TTL policy: auto-delete entries older than 365 days
userPredictionSchema.index({ predictionDate: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });

// Get user's prediction history
userPredictionSchema.statics.getUserHistory = function (userId, limit = 30) {
  return this.find({ userId })
    .sort({ predictionDate: -1 })
    .limit(limit)
    .lean();
};

// Get leaderboard: users ranked by total XP earned from predictions
userPredictionSchema.statics.getLeaderboard = function (limit = 20) {
  return this.aggregate([
    { $match: { status: 'EVALUATED' } },
    {
      $group: {
        _id: '$userId',
        totalXP: { $sum: '$xpEarned' },
        totalPredictions: { $sum: 1 },
        totalBeatAI: { $sum: { $cond: ['$userBeatAI', 1, 0] } },
        avgAccuracy: { $avg: '$userAccuracy' }
      }
    },
    { $sort: { totalXP: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 1,
        totalXP: 1,
        totalPredictions: 1,
        totalBeatAI: 1,
        avgAccuracy: { $round: ['$avgAccuracy', 2] },
        userName: '$user.name',
        userLevel: '$user.stats.level'
      }
    }
  ]);
};

// Get user's active prediction streak (consecutive days with at least one prediction)
userPredictionSchema.statics.getUserStreak = async function (userId) {
  const preds = await this.find({
    userId,
    status: 'EVALUATED',
    userAccuracy: { $lte: 5 } // within 5% counts as "correct"
  }).sort({ predictionDate: -1 }).select('predictionDate').lean();

  if (preds.length === 0) return 0;

  let streak = 1;
  for (let i = 1; i < preds.length; i++) {
    const diff = (preds[i - 1].predictionDate - preds[i].predictionDate) / (1000 * 60 * 60 * 24);
    // Allow weekends (max gap of 3 calendar days = 1 trading day gap)
    if (diff <= 4) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

const UserPrediction = mongoose.model('UserPrediction', userPredictionSchema);

module.exports = UserPrediction;
