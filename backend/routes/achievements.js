const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const achievementService = require('../services/AchievementService');
const User = require('../models/User');

/**
 * @route   GET /api/achievements
 * @desc    Get user's achievements and progress
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await achievementService.getUserAchievements(userId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'User achievements not found'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error fetching achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch achievements'
    });
  }
});

/**
 * @route   POST /api/achievements/daily-login
 * @desc    Handle daily login and check achievements
 * @access  Private
 */
router.post('/daily-login', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await achievementService.updateLoginStreak(userId);
    
    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update login streak'
      });
    }

    // Check for any new achievements triggered by login
    const allAchievements = await achievementService.checkAchievements(userId, 'DAILY_LOGIN');

    res.json({
      success: true,
      data: {
        loginStreak: result.streak,
        bonus: result.bonus,
        achievements: allAchievements,
        message: result.bonus > 0 
          ? `Welcome back! ${result.streak} day streak. You earned ₹${result.bonus} bonus!`
          : `Welcome back! Current streak: ${result.streak} days`
      }
    });
  } catch (error) {
    console.error('❌ Error handling daily login:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process daily login'
    });
  }
});

/**
 * @route   GET /api/achievements/leaderboard
 * @desc    Get leaderboard rankings
 * @access  Private
 */
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const { type = 'profit', limit = 10 } = req.query;
    const leaderboard = await achievementService.getLeaderboard(type, parseInt(limit));
    
    // Get current user's position
    const currentUser = await User.findById(req.user._id)
      .select('name email stats loginStreak achievements totalProfitLoss totalPortfolioValue virtualBalance');

    let userRank = null;
    if (currentUser) {
      const allUsers = await achievementService.getLeaderboard(type, 1000);
      userRank = allUsers.findIndex(user => user.userId?.toString() === currentUser._id.toString()) + 1;
    }

    res.json({
      success: true,
      data: {
        leaderboard,
        userRank,
        currentUser: currentUser ? {
          name: currentUser.name,
          email: currentUser.email,
          experiencePoints: currentUser.stats?.experiencePoints || 0,
          level: currentUser.stats?.level || 1,
          totalTrades: currentUser.stats?.totalTrades || 0,
          totalProfit: currentUser.stats?.totalProfit || 0,
          totalProfitLoss: currentUser.totalProfitLoss || 0,
          portfolioValue: currentUser.totalPortfolioValue || 0,
          virtualBalance: currentUser.virtualBalance || 50000,
          bestStreak: currentUser.loginStreak?.best || 0,
          achievementCount: currentUser.achievements?.length || 0
        } : null
      }
    });
  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard'
    });
  }
});

/**
 * @route   POST /api/achievements/notify
 * @desc    Mark achievements as notified
 * @access  Private
 */
router.post('/notify', auth, async (req, res) => {
  try {
    const { achievementIds } = req.body;
    const userId = req.user._id;

    if (!achievementIds || !Array.isArray(achievementIds)) {
      return res.status(400).json({
        success: false,
        message: 'Achievement IDs array is required'
      });
    }

    const success = await achievementService.markAchievementsAsNotified(userId, achievementIds);

    if (success) {
      res.json({
        success: true,
        message: 'Achievements marked as notified'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to mark achievements as notified'
      });
    }
  } catch (error) {
    console.error('❌ Error marking achievements as notified:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification status'
    });
  }
});

/**
 * @route   GET /api/achievements/stats
 * @desc    Get user's gamification stats
 * @access  Private
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('stats loginStreak achievements');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate next level XP requirement
    const currentLevel = user.stats.level;
    const currentXP = user.stats.experiencePoints;
    const xpForCurrentLevel = (currentLevel - 1) * 100;
    const xpForNextLevel = currentLevel * 100;
    const progressToNextLevel = currentXP - xpForCurrentLevel;
    const xpNeededForNext = xpForNextLevel - currentXP;

    res.json({
      success: true,
      data: {
        level: user.stats.level,
        experiencePoints: user.stats.experiencePoints,
        totalTrades: user.stats.totalTrades,
        totalProfit: user.stats.totalProfit,
        badges: user.stats.badges,
        achievementsUnlocked: user.achievements.length,
        loginStreak: user.loginStreak,
        levelProgress: {
          current: progressToNextLevel,
          required: 100,
          percentage: Math.round((progressToNextLevel / 100) * 100),
          xpNeeded: Math.max(0, xpNeededForNext)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user stats'
    });
  }
});

/**
 * @route   POST /api/achievements/check
 * @desc    Manually check achievements for testing
 * @access  Private
 */
router.post('/check', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { eventType = 'MANUAL_CHECK', data = {} } = req.body;

    const unlockedAchievements = await achievementService.checkAchievements(userId, eventType, data);

    res.json({
      success: true,
      data: {
        unlockedAchievements,
        message: unlockedAchievements.length > 0 
          ? `Unlocked ${unlockedAchievements.length} new achievement(s)!`
          : 'No new achievements unlocked'
      }
    });
  } catch (error) {
    console.error('❌ Error checking achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check achievements'
    });
  }
});

module.exports = router;
