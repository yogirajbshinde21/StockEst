const cron = require('node-cron');
const newsService = require('../services/newsService');

class NewsScheduler {
  constructor() {
    this.isRunning = false;
    this.lastRunTime = null;
    this.intervalInstance = null;
    this.successfulRuns = 0;
    this.failedRuns = 0;
    this.currentInterval = null;
    
    console.log('📅 Real-time NewsScheduler initialized with dynamic intervals');
  }

  /**
   * Start the real-time news update scheduler with dynamic intervals
   */
  startScheduler() {
    try {
      console.log('⏰ Starting real-time news scheduler with dynamic intervals');
      console.log('📊 Market Hours (Mon-Fri 8AM-7PM IST): Every 1 hour (11 calls/day)');
      console.log('� Weekends/Off-Hours: Every 3 hours (8 calls/day)');
      console.log('🎯 Target: ~280-300 API calls per month for continuous coverage');
      
      // Start with an immediate check, then set up dynamic scheduling
      this.scheduleNextRun();
      
      console.log('✅ Real-time news scheduler started successfully');
      
      // Run initial news fetch after 30 seconds
      setTimeout(async () => {
        console.log('🚀 Running initial real-time news fetch...');
        await this.runNewsUpdateJob();
      }, 30000);
      
    } catch (error) {
      console.error('❌ Error starting news scheduler:', error.message);
      this.isRunning = false;
    }
  }

  /**
   * Schedule the next news update based on current market conditions
   */
  scheduleNextRun() {
    // Clear existing interval if any
    if (this.intervalInstance) {
      clearTimeout(this.intervalInstance);
    }
    
    // Get current appropriate interval
    const interval = newsService.getCurrentInterval();
    const isMarketDay = newsService.isMarketDay();
    const isExtendedHours = newsService.isExtendedMarketHours();
    
    console.log(`⏰ Scheduling next news update in ${interval / (60 * 1000)} minutes`);
    console.log(`📊 Mode: ${isMarketDay && isExtendedHours ? 'Market Hours' : isMarketDay ? 'Market Day Off-Hours' : 'Weekend/Holiday'}`);
    
    this.currentInterval = interval;
    this.intervalInstance = setTimeout(async () => {
      await this.runNewsUpdateJob();
      // Schedule the next run after this one completes
      this.scheduleNextRun();
    }, interval);
  }

  /**
   * Run the news update job
   */
  async runNewsUpdateJob() {
    if (this.isRunning) {
      console.log('⏸️ News update job already running, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      this.lastRunTime = new Date();
      
      console.log('🔄 Starting scheduled news update job...');
      console.log(`⏰ Job start time: ${this.lastRunTime.toISOString()}`);
      console.log(`📊 Previous runs - Success: ${this.successfulRuns}, Failed: ${this.failedRuns}`);
      
      const startTime = Date.now();
      const result = await newsService.processAndStoreNews();
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      if (result.success) {
        this.successfulRuns++;
        console.log(`✅ Scheduled news update completed successfully in ${duration}s`);
        console.log(`📈 Result: ${result.affectedStocks || 0} affected stocks, ${result.callsToday}/${result.maxCalls} API calls today`);
      } else {
        this.failedRuns++;
        console.log(`⚠️ Scheduled news update completed with issues in ${duration}s`);
        console.log(`📊 Reason: ${result.message}, ${result.callsToday}/${result.maxCalls} API calls today`);
      }
      
      // Log next run time
      this.logNextRunTime();
      
    } catch (error) {
      this.failedRuns++;
      console.error('❌ Error in scheduled news update job:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Log when the next run will occur
   */
  logNextRunTime() {
    try {
      const now = new Date();
      const nextRun = new Date(now);
      
      // Find next 4-hour mark
      const currentHour = now.getHours();
      const nextHour = Math.ceil((currentHour + 1) / 4) * 4;
      
      if (nextHour >= 24) {
        // Next day
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(0, 0, 0, 0);
      } else {
        nextRun.setHours(nextHour, 0, 0, 0);
      }
      
      // If next run is on weekend, move to Monday
      while (nextRun.getDay() === 0 || nextRun.getDay() === 6) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      
      const timeUntilNext = nextRun.getTime() - now.getTime();
      const hoursUntilNext = Math.floor(timeUntilNext / (1000 * 60 * 60));
      const minutesUntilNext = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
      
      console.log(`⏭️ Next scheduled run: ${nextRun.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`⏳ Time until next run: ${hoursUntilNext}h ${minutesUntilNext}m`);
      
    } catch (error) {
      console.error('❌ Error calculating next run time:', error.message);
    }
  }

  /**
   * Stop the real-time news scheduler
   */
  stopScheduler() {
    try {
      if (this.intervalInstance) {
        clearTimeout(this.intervalInstance);
        this.intervalInstance = null;
        console.log('🛑 Real-time news scheduler stopped');
        return true;
      } else {
        console.log('⚠️ Real-time news scheduler was not running');
        return false;
      }
    } catch (error) {
      console.error('❌ Error stopping news scheduler:', error.message);
      return false;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: this.jobInstance ? this.jobInstance.scheduled : false,
      lastRunTime: this.lastRunTime,
      successfulRuns: this.successfulRuns,
      failedRuns: this.failedRuns,
      cronExpression: '0 */4 * * 1-5',
      description: 'Every 4 hours during weekdays',
      timezone: 'Asia/Kolkata',
      maxCallsPerDay: 6,
      interval: '4 hours'
    };
  }

  /**
   * Manually trigger news update
   */
  async triggerManualUpdate() {
    if (this.isRunning) {
      throw new Error('News update job is already running');
    }
    
    console.log('🔄 Manual news update triggered by admin');
    return await this.runNewsUpdateJob();
  }

  /**
   * Restart scheduler
   */
  restartScheduler() {
    console.log('🔄 Restarting news scheduler...');
    this.stopScheduler();
    return this.startScheduler();
  }

  /**
   * Get detailed statistics
   */
  getDetailedStats() {
    const status = this.getStatus();
    const uptime = this.lastRunTime ? Date.now() - this.lastRunTime.getTime() : 0;
    
    return {
      ...status,
      uptimeMs: uptime,
      uptimeHours: Math.floor(uptime / (1000 * 60 * 60)),
      successRate: this.successfulRuns + this.failedRuns > 0 ? 
        ((this.successfulRuns / (this.successfulRuns + this.failedRuns)) * 100).toFixed(2) + '%' : 
        'N/A'
    };
  }
}

// Create singleton instance
const newsScheduler = new NewsScheduler();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('📴 Shutting down news scheduler...');
  newsScheduler.stopScheduler();
});

process.on('SIGTERM', () => {
  console.log('📴 Shutting down news scheduler...');
  newsScheduler.stopScheduler();
});

module.exports = newsScheduler;
