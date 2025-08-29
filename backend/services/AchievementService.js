const User = require('../models/User');
const { achievements, getAllAchievements, getAchievementById } = require('../config/achievements');

class AchievementService {
  constructor() {
    this.achievements = achievements;
  }

  // Check and unlock achievements for a user
  async checkAchievements(userId, eventType, data = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) return [];

      const unlockedAchievements = [];
      const allAchievements = getAllAchievements();

      for (const achievement of allAchievements) {
        // Skip if user already has this achievement
        if (user.hasAchievement(achievement.id)) continue;

        // Check if achievement conditions are met
        const progress = this.calculateProgress(user, achievement, data);
        
        if (progress >= achievement.condition.target) {
          // Unlock achievement
          const wasAdded = user.addAchievement(achievement.id, progress);
          
          if (wasAdded) {
            // Add experience points
            const result = user.addExperiencePoints(
              achievement.experiencePoints, 
              `Achievement: ${achievement.name}`
            );

            // Add badge
            if (!user.stats.badges.includes(achievement.id)) {
              user.stats.badges.push(achievement.id);
            }

            // Give reward
            if (achievement.reward.type === 'VIRTUAL_MONEY') {
              user.virtualBalance += achievement.reward.amount;
            }

            unlockedAchievements.push({
              achievement,
              levelUp: result.leveledUp,
              newLevel: result.newLevel
            });

            console.log(`🏆 User ${user.name} unlocked: ${achievement.name}`);
          }
        }
      }

      // Save user changes
      if (unlockedAchievements.length > 0) {
        await user.save();
      }

      return unlockedAchievements;
    } catch (error) {
      console.error('❌ Error checking achievements:', error);
      return [];
    }
  }

  // Calculate progress for a specific achievement
  calculateProgress(user, achievement, eventData = {}) {
    const { condition } = achievement;
    
    switch (condition.type) {
      case 'TRADE_COUNT':
        return user.stats.totalTrades;
      
      case 'TOTAL_PROFIT':
        return Math.max(0, user.stats.totalProfit);
      
      case 'PORTFOLIO_DIVERSITY':
        return user.portfolio ? user.portfolio.length : 0;
      
      case 'LOGIN_STREAK':
        return user.loginStreak.current;
      
      case 'PORTFOLIO_VALUE':
        return user.virtualBalance + user.totalPortfolioValue;
      
      case 'LEVEL_REACHED':
        return user.stats.level;
      
      case 'FIRST_DAY_PROFIT':
        // Check if user made profit on first day
        const userCreated = new Date(user.createdAt);
        const today = new Date();
        const daysSinceCreation = Math.floor((today - userCreated) / (1000 * 60 * 60 * 24));
        return daysSinceCreation === 0 && user.stats.totalProfit > 0 ? 1 : 0;
      
      case 'HOLDING_PERIOD':
        // Check if any stock has been held for target days
        if (!user.portfolio || user.portfolio.length === 0) return 0;
        
        const oldestHolding = Math.max(...user.transactions
          .filter(t => t.type === 'BUY')
          .map(t => {
            const daysSincePurchase = Math.floor((new Date() - new Date(t.timestamp)) / (1000 * 60 * 60 * 24));
            return daysSincePurchase;
          }));
        
        return oldestHolding || 0;
      
      case 'PROFIT_STREAK':
        // This would require more complex tracking - simplified for now
        return eventData.profitStreak || 0;
      
      default:
        return 0;
    }
  }

  // Update login streak and check for related achievements
  async updateLoginStreak(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      const streakResult = user.updateLoginStreak();
      await user.save();

      // Check for streak-related achievements
      const achievements = await this.checkAchievements(userId, 'LOGIN_STREAK');

      return {
        streak: streakResult.streak,
        bonus: streakResult.bonus,
        achievements
      };
    } catch (error) {
      console.error('❌ Error updating login streak:', error);
      return null;
    }
  }

  // Handle trading events and check achievements
  async onTradeCompleted(userId, tradeData) {
    try {
      const user = await User.findById(userId);
      if (!user) return [];

      // Update trading stats
      const levelResult = user.updateTradingStats(
        tradeData.type, 
        tradeData.amount, 
        tradeData.profit || 0
      );

      await user.save();

      // Check for achievements
      const achievements = await this.checkAchievements(userId, 'TRADE_COMPLETED', {
        ...tradeData,
        levelUp: levelResult.leveledUp
      });

      return achievements;
    } catch (error) {
      console.error('❌ Error handling trade completion:', error);
      return [];
    }
  }

  // Get user achievements with progress
  async getUserAchievements(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      const allAchievements = getAllAchievements();
      const userAchievements = allAchievements.map(achievement => {
        const userAchievement = user.achievements.find(ua => ua.achievementId === achievement.id);
        const progress = this.calculateProgress(user, achievement);
        const progressPercentage = Math.min(100, Math.round((progress / achievement.condition.target) * 100));

        return {
          ...achievement,
          isUnlocked: !!userAchievement,
          unlockedAt: userAchievement?.unlockedAt || null,
          progress: progress,
          progressPercentage,
          target: achievement.condition.target,
          isNotified: userAchievement?.isNotified || false
        };
      });

      return {
        achievements: userAchievements,
        totalAchievements: allAchievements.length,
        unlockedCount: user.achievements.length,
        experiencePoints: user.stats.experiencePoints,
        level: user.stats.level,
        badges: user.stats.badges,
        loginStreak: user.loginStreak
      };
    } catch (error) {
      console.error('❌ Error getting user achievements:', error);
      return null;
    }
  }

  // Get leaderboard data
  async getLeaderboard(type = 'profit', limit = 10) {
    try {
      let sortField = {};
      
      switch (type) {
        case 'profit':
          sortField = { 'totalProfitLoss': -1 };
          break;
        case 'portfolio':
          sortField = { 'totalPortfolioValue': -1 };
          break;
        case 'xp':
          sortField = { 'stats.experiencePoints': -1 };
          break;
        case 'level':
          sortField = { 'stats.level': -1, 'stats.experiencePoints': -1 };
          break;
        case 'trades':
          sortField = { 'stats.totalTrades': -1 };
          break;
        case 'streak':
          sortField = { 'loginStreak.best': -1 };
          break;
        default:
          sortField = { 'totalProfitLoss': -1 };
      }

      const leaderboard = await User.find({})
        .select('name email stats loginStreak achievements totalProfitLoss totalPortfolioValue virtualBalance')
        .sort(sortField)
        .limit(limit)
        .lean();

      return leaderboard.map((user, index) => ({
        rank: index + 1,
        userId: user._id,
        name: user.name,
        email: user.email,
        experiencePoints: user.stats?.experiencePoints || 0,
        level: user.stats?.level || 1,
        totalTrades: user.stats?.totalTrades || 0,
        totalProfit: user.stats?.totalProfit || 0,
        totalProfitLoss: user.totalProfitLoss || 0,
        portfolioValue: user.totalPortfolioValue || 0,
        virtualBalance: user.virtualBalance || 50000,
        bestStreak: user.loginStreak?.best || 0,
        achievementCount: user.achievements?.length || 0,
        badges: user.stats?.badges || []
      }));
    } catch (error) {
      console.error('❌ Error getting leaderboard:', error);
      return [];
    }
  }

  // Mark achievements as notified
  async markAchievementsAsNotified(userId, achievementIds) {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      achievementIds.forEach(achievementId => {
        const achievement = user.achievements.find(a => a.achievementId === achievementId);
        if (achievement) {
          achievement.isNotified = true;
        }
      });

      await user.save();
      return true;
    } catch (error) {
      console.error('❌ Error marking achievements as notified:', error);
      return false;
    }
  }

  // Calculate experience points for different actions
  calculateExperiencePoints(action, amount = 0) {
    const xpRates = {
      'BUY': 5,
      'SELL': 10,
      'PROFITABLE_TRADE': 15,
      'DAILY_LOGIN': 2,
      'STREAK_BONUS': 5,
      'FIRST_TRADE': 25,
      'PORTFOLIO_DIVERSITY': 20
    };

    return xpRates[action] || 0;
  }
}

module.exports = new AchievementService();
