const cron = require('node-cron');
const portfolioAnalyticsService = require('../services/PortfolioAnalyticsService');
const User = require('../models/User');

class PortfolioAnalyticsScheduler {
  constructor() {
    this.isRunning = false;
    this.lastRunTime = null;
    this.successfulRuns = 0;
    this.failedRuns = 0;
    
    console.log('📊 Portfolio Analytics Scheduler initialized');
  }

  /**
   * Start the portfolio analytics scheduler
   */
  startScheduler() {
    try {
      console.log('⏰ Starting Portfolio Analytics scheduler');
      
      // Daily snapshot creation at 6 PM IST (market close)
      cron.schedule('0 18 * * 1-5', async () => {
        console.log('📈 Running daily portfolio snapshots for all users...');
        await this.createDailySnapshotsForAllUsers();
      }, {
        timezone: "Asia/Kolkata"
      });

      // Weekly analytics calculation on Saturday at 9 AM
      cron.schedule('0 9 * * 6', async () => {
        console.log('📊 Running weekly portfolio analytics calculation...');
        await this.calculateAnalyticsForAllUsers();
      }, {
        timezone: "Asia/Kolkata"
      });

      // Hourly snapshot updates during market hours (9 AM to 4 PM)
      cron.schedule('0 9-16 * * 1-5', async () => {
        console.log('🔄 Running hourly portfolio snapshot updates...');
        await this.updateActivePortfolioSnapshots();
      }, {
        timezone: "Asia/Kolkata"
      });

      this.isRunning = true;
      console.log('✅ Portfolio Analytics scheduler started successfully');
      
      // Log schedule details
      console.log('📅 Schedule Details:');
      console.log('   • Daily snapshots: 6:00 PM IST (Mon-Fri)');
      console.log('   • Weekly analytics: 9:00 AM IST (Saturday)');
      console.log('   • Hourly updates: 9:00 AM - 4:00 PM IST (Mon-Fri)');
      
    } catch (error) {
      console.error('❌ Error starting portfolio analytics scheduler:', error.message);
      this.isRunning = false;
    }
  }

  /**
   * Create daily snapshots for all users
   */
  async createDailySnapshotsForAllUsers() {
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    try {
      console.log('🔍 Finding users with active portfolios...');
      
      // Find users who have portfolio holdings or recent transactions
      const activeUsers = await User.find({
        $or: [
          { 'portfolio.0': { $exists: true } }, // Has portfolio items
          { 'transactions.timestamp': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Recent transactions
        ]
      }).select('_id email');

      console.log(`📊 Found ${activeUsers.length} active users for snapshot creation`);

      for (const user of activeUsers) {
        try {
          await portfolioAnalyticsService.createDailySnapshot(user._id);
          successCount++;
          
          // Add a small delay to prevent overwhelming the system
          if (successCount % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          console.error(`❌ Error creating snapshot for user ${user.email}:`, error.message);
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Daily snapshots completed in ${duration}ms`);
      console.log(`   • Successful: ${successCount}`);
      console.log(`   • Errors: ${errorCount}`);
      
      this.successfulRuns++;
      this.lastRunTime = new Date();

    } catch (error) {
      console.error('❌ Error in daily snapshots job:', error);
      this.failedRuns++;
    }
  }

  /**
   * Calculate analytics for all users
   */
  async calculateAnalyticsForAllUsers() {
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    try {
      console.log('🧮 Calculating portfolio analytics for all users...');
      
      // Find users with portfolio data
      const activeUsers = await User.find({
        'portfolio.0': { $exists: true }
      }).select('_id email');

      console.log(`📈 Found ${activeUsers.length} users for analytics calculation`);

      for (const user of activeUsers) {
        try {
          await portfolioAnalyticsService.calculatePortfolioAnalytics(user._id);
          successCount++;
          
          // Add a small delay to prevent overwhelming the system
          if (successCount % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
        } catch (error) {
          console.error(`❌ Error calculating analytics for user ${user.email}:`, error.message);
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Analytics calculation completed in ${duration}ms`);
      console.log(`   • Successful: ${successCount}`);
      console.log(`   • Errors: ${errorCount}`);

    } catch (error) {
      console.error('❌ Error in analytics calculation job:', error);
    }
  }

  /**
   * Update portfolio snapshots for active users during market hours
   */
  async updateActivePortfolioSnapshots() {
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    try {
      // Only update for users who have made transactions in the last hour
      const recentlyActiveUsers = await User.find({
        'transactions.timestamp': { 
          $gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      }).select('_id email');

      if (recentlyActiveUsers.length === 0) {
        console.log('🔄 No recently active users found for hourly update');
        return;
      }

      console.log(`🔄 Updating snapshots for ${recentlyActiveUsers.length} recently active users`);

      for (const user of recentlyActiveUsers) {
        try {
          await portfolioAnalyticsService.createDailySnapshot(user._id);
          successCount++;
          
        } catch (error) {
          console.error(`❌ Error updating snapshot for user ${user.email}:`, error.message);
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Hourly snapshot updates completed in ${duration}ms`);
      console.log(`   • Successful: ${successCount}`);
      console.log(`   • Errors: ${errorCount}`);

    } catch (error) {
      console.error('❌ Error in hourly update job:', error);
    }
  }

  /**
   * Stop the scheduler
   */
  stopScheduler() {
    try {
      console.log('⏹️ Stopping Portfolio Analytics scheduler...');
      // Note: node-cron doesn't provide a direct way to stop all tasks
      // In a production environment, you'd want to store task references
      this.isRunning = false;
      console.log('✅ Portfolio Analytics scheduler stopped');
    } catch (error) {
      console.error('❌ Error stopping portfolio analytics scheduler:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      successfulRuns: this.successfulRuns,
      failedRuns: this.failedRuns,
      uptime: this.lastRunTime ? Date.now() - this.lastRunTime.getTime() : 0
    };
  }

  /**
   * Manual trigger for testing
   */
  async runManualSnapshot(userId = null) {
    try {
      console.log('🔧 Running manual portfolio snapshot...');
      
      if (userId) {
        await portfolioAnalyticsService.createDailySnapshot(userId);
        console.log(`✅ Manual snapshot created for user: ${userId}`);
      } else {
        await this.createDailySnapshotsForAllUsers();
        console.log('✅ Manual snapshots created for all users');
      }
      
    } catch (error) {
      console.error('❌ Error in manual snapshot:', error);
      throw error;
    }
  }

  /**
   * Manual trigger for analytics calculation
   */
  async runManualAnalytics(userId = null) {
    try {
      console.log('🔧 Running manual analytics calculation...');
      
      if (userId) {
        await portfolioAnalyticsService.calculatePortfolioAnalytics(userId);
        console.log(`✅ Manual analytics calculated for user: ${userId}`);
      } else {
        await this.calculateAnalyticsForAllUsers();
        console.log('✅ Manual analytics calculated for all users');
      }
      
    } catch (error) {
      console.error('❌ Error in manual analytics:', error);
      throw error;
    }
  }
}

module.exports = new PortfolioAnalyticsScheduler();
