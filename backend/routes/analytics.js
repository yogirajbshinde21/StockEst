const express = require('express');
const portfolioAnalyticsService = require('../services/PortfolioAnalyticsService');
const portfolioAnalyticsScheduler = require('../utils/portfolioAnalyticsScheduler');
const portfolioIntelligenceDemoData = require('../utils/portfolioIntelligenceDemoData');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/analytics/portfolio-timeline
 * @desc    Get portfolio performance timeline
 * @access  Private
 */
router.get('/portfolio-timeline', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user._id;

    const timeline = await portfolioAnalyticsService.getPerformanceTimeline(userId, parseInt(days));
    
    res.json({
      success: true,
      data: {
        timeline,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Portfolio timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch portfolio timeline'
    });
  }
});

/**
 * @route   GET /api/analytics/portfolio-analytics
 * @desc    Get comprehensive portfolio analytics
 * @access  Private
 */
router.get('/portfolio-analytics', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const analytics = await portfolioAnalyticsService.calculatePortfolioAnalytics(userId);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Portfolio analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch portfolio analytics'
    });
  }
});

/**
 * @route   GET /api/analytics/milestones
 * @desc    Get performance milestones
 * @access  Private
 */
router.get('/milestones', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user._id;

    const milestones = await portfolioAnalyticsService.getPerformanceMilestones(userId, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        milestones,
        count: milestones.length
      }
    });
  } catch (error) {
    console.error('Milestones error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch milestones'
    });
  }
});

/**
 * @route   POST /api/analytics/create-snapshot
 * @desc    Create or update daily portfolio snapshot
 * @access  Private
 */
router.post('/create-snapshot', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const snapshot = await portfolioAnalyticsService.createDailySnapshot(userId);
    
    res.json({
      success: true,
      data: {
        snapshot,
        message: 'Portfolio snapshot created successfully'
      }
    });
  } catch (error) {
    console.error('Create snapshot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create portfolio snapshot'
    });
  }
});

/**
 * @route   GET /api/analytics/dashboard-data
 * @desc    Get comprehensive dashboard data
 * @access  Private
 */
router.get('/dashboard-data', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { timeframe = '30' } = req.query;

    // Get all dashboard data in parallel
    const [timeline, analytics, milestones] = await Promise.all([
      portfolioAnalyticsService.getPerformanceTimeline(userId, parseInt(timeframe)),
      portfolioAnalyticsService.calculatePortfolioAnalytics(userId),
      portfolioAnalyticsService.getPerformanceMilestones(userId, 5)
    ]);
    
    res.json({
      success: true,
      data: {
        timeline,
        analytics,
        milestones,
        timeframe: parseInt(timeframe)
      }
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

/**
 * @route   POST /api/analytics/manual-snapshot
 * @desc    Manually trigger portfolio snapshot creation
 * @access  Private
 */
router.post('/manual-snapshot', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    await portfolioAnalyticsScheduler.runManualSnapshot(userId);
    
    res.json({
      success: true,
      message: 'Portfolio snapshot created successfully'
    });
  } catch (error) {
    console.error('Manual snapshot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create portfolio snapshot'
    });
  }
});

/**
 * @route   POST /api/analytics/manual-analytics
 * @desc    Manually trigger analytics calculation
 * @access  Private
 */
router.post('/manual-analytics', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    await portfolioAnalyticsScheduler.runManualAnalytics(userId);
    
    res.json({
      success: true,
      message: 'Portfolio analytics calculated successfully'
    });
  } catch (error) {
    console.error('Manual analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate portfolio analytics'
    });
  }
});

/**
 * @route   GET /api/analytics/scheduler-status
 * @desc    Get portfolio analytics scheduler status
 * @access  Private
 */
router.get('/scheduler-status', auth, async (req, res) => {
  try {
    const status = portfolioAnalyticsScheduler.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Scheduler status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduler status'
    });
  }
});

/**
 * @route   POST /api/analytics/generate-demo-data
 * @desc    Generate demo data for testing Portfolio Intelligence
 * @access  Private
 */
router.post('/generate-demo-data', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 30 } = req.body;

    const demoData = await portfolioIntelligenceDemoData.generateCompleteDemo(userId, parseInt(days));
    
    res.json({
      success: true,
      message: `Demo data generated successfully for ${days} days`,
      data: {
        snapshots: demoData.snapshots.length,
        milestones: demoData.milestones.length,
        analytics: !!demoData.analytics
      }
    });
  } catch (error) {
    console.error('Generate demo data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate demo data'
    });
  }
});

/**
 * @route   DELETE /api/analytics/clear-demo-data
 * @desc    Clear demo data for user
 * @access  Private
 */
router.delete('/clear-demo-data', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    await portfolioIntelligenceDemoData.clearExistingData(userId);
    
    res.json({
      success: true,
      message: 'Demo data cleared successfully'
    });
  } catch (error) {
    console.error('Clear demo data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear demo data'
    });
  }
});

/**
 * @route   GET /api/analytics/demo-data-summary
 * @desc    Get demo data summary for user
 * @access  Private
 */
router.get('/demo-data-summary', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const summary = await portfolioIntelligenceDemoData.getDemoDataSummary(userId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Demo data summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get demo data summary'
    });
  }
});

module.exports = router;
