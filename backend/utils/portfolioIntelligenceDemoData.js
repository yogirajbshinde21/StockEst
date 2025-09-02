/**
 * Demo data generator for Portfolio Intelligence Dashboard
 * This file creates sample portfolio data for testing and demonstration purposes
 */

const { PortfolioSnapshot, PerformanceMilestone, PortfolioAnalytics } = require('../models/PortfolioAnalytics');
const User = require('../models/User');

class PortfolioIntelligenceDemoData {
  
  /**
   * Generate sample portfolio snapshots for a user
   */
  async generateSampleSnapshots(userId, days = 30) {
    try {
      console.log(`🔧 Generating ${days} days of sample portfolio snapshots for user ${userId}`);
      
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const snapshots = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let currentValue = 95000; // Starting portfolio value
      let currentInvested = 90000; // Starting invested amount
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        date.setHours(18, 0, 0, 0); // 6 PM snapshots
        
        // Generate realistic market movements
        const dailyChange = (Math.random() - 0.5) * 0.04; // -2% to +2% daily change
        const marketFactor = Math.random() > 0.7 ? 1.5 : 1; // 30% chance of higher volatility
        
        currentValue = Math.max(currentValue * (1 + dailyChange * marketFactor), currentInvested * 0.8);
        
        // Occasionally add investments
        if (Math.random() > 0.9) {
          const newInvestment = Math.random() * 5000 + 2000;
          currentInvested += newInvestment;
          currentValue += newInvestment;
        }

        const totalProfitLoss = currentValue - currentInvested;
        const totalProfitLossPercent = currentInvested > 0 ? (totalProfitLoss / currentInvested) * 100 : 0;
        
        // Calculate day change
        const previousValue = i > 0 ? snapshots[i - 1].totalValue : currentValue;
        const dayChange = currentValue - previousValue;
        const dayChangePercent = previousValue > 0 ? (dayChange / previousValue) * 100 : 0;

        const snapshot = {
          userId,
          date,
          totalValue: Math.round(currentValue),
          totalInvested: Math.round(currentInvested),
          totalProfitLoss: Math.round(totalProfitLoss),
          totalProfitLossPercent: parseFloat(totalProfitLossPercent.toFixed(2)),
          cashBalance: user.virtualBalance || 10000,
          holdings: this.generateSampleHoldings(currentValue),
          sectorAllocation: this.generateSampleSectorAllocation(),
          dayChange: Math.round(dayChange),
          dayChangePercent: parseFloat(dayChangePercent.toFixed(2)),
          milestones: []
        };

        snapshots.push(snapshot);
      }

      // Save snapshots to database
      await PortfolioSnapshot.insertMany(snapshots);
      console.log(`✅ Generated ${snapshots.length} sample snapshots`);
      
      return snapshots;
    } catch (error) {
      console.error('Error generating sample snapshots:', error);
      throw error;
    }
  }

  /**
   * Generate sample holdings
   */
  generateSampleHoldings(totalValue) {
    const sampleStocks = [
      { symbol: 'RELIANCE', instrumentKey: 'NSE_EQ|INE002A01018', weightage: 25 },
      { symbol: 'TCS', instrumentKey: 'NSE_EQ|INE467B01029', weightage: 20 },
      { symbol: 'HDFCBANK', instrumentKey: 'NSE_EQ|INE040A01034', weightage: 18 },
      { symbol: 'INFY', instrumentKey: 'NSE_EQ|INE009A01021', weightage: 15 },
      { symbol: 'ICICIBANK', instrumentKey: 'NSE_EQ|INE090A01021', weightage: 12 },
      { symbol: 'WIPRO', instrumentKey: 'NSE_EQ|INE075A01022', weightage: 10 }
    ];

    return sampleStocks.map(stock => {
      const currentValue = (totalValue * stock.weightage) / 100;
      const averagePrice = Math.random() * 500 + 100; // Random price between 100-600
      const quantity = Math.round(currentValue / averagePrice);
      const actualCurrentValue = quantity * averagePrice;
      const profitLoss = actualCurrentValue - (actualCurrentValue * 0.9); // Assume 10% profit
      const profitLossPercent = 10 + (Math.random() - 0.5) * 20; // -10% to +20%

      return {
        symbol: stock.symbol,
        instrumentKey: stock.instrumentKey,
        quantity,
        currentPrice: averagePrice + (Math.random() - 0.5) * 50,
        currentValue: Math.round(actualCurrentValue),
        profitLoss: Math.round(profitLoss),
        profitLossPercent: parseFloat(profitLossPercent.toFixed(2)),
        weightage: parseFloat(stock.weightage.toFixed(2))
      };
    });
  }

  /**
   * Generate sample sector allocation
   */
  generateSampleSectorAllocation() {
    return [
      { sector: 'Technology', value: 35000, percentage: 35 },
      { sector: 'Banking & Financial', value: 30000, percentage: 30 },
      { sector: 'Energy', value: 20000, percentage: 20 },
      { sector: 'Healthcare', value: 10000, percentage: 10 },
      { sector: 'Consumer Goods', value: 5000, percentage: 5 }
    ];
  }

  /**
   * Generate sample milestones
   */
  async generateSampleMilestones(userId) {
    try {
      console.log(`🏆 Generating sample milestones for user ${userId}`);
      
      const milestones = [
        {
          userId,
          type: 'FIRST_INVESTMENT',
          value: 10000,
          description: 'Made your first investment of ₹10,000!',
          achievedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) // 25 days ago
        },
        {
          userId,
          type: 'PROFIT_1K',
          value: 1000,
          description: 'Achieved ₹1,000 in total profits!',
          achievedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
        },
        {
          userId,
          type: 'DIVERSIFICATION_5_STOCKS',
          value: 5,
          description: 'Diversified portfolio with 5 different stocks!',
          achievedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
        },
        {
          userId,
          type: 'PROFIT_5K',
          value: 5000,
          description: 'Achieved ₹5,000 in total profits!',
          achievedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
        },
        {
          userId,
          type: 'PORTFOLIO_VALUE_100K',
          value: 100000,
          description: 'Portfolio value reached ₹1,00,000!',
          achievedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        }
      ];

      await PerformanceMilestone.insertMany(milestones);
      console.log(`✅ Generated ${milestones.length} sample milestones`);
      
      return milestones;
    } catch (error) {
      console.error('Error generating sample milestones:', error);
      throw error;
    }
  }

  /**
   * Generate sample portfolio analytics
   */
  async generateSampleAnalytics(userId) {
    try {
      console.log(`📊 Generating sample analytics for user ${userId}`);
      
      const analytics = {
        userId,
        lastUpdated: new Date(),
        performance: {
          totalReturn: 8500,
          totalReturnPercent: 9.44,
          annualizedReturn: 15.2,
          volatility: 18.5,
          sharpeRatio: 0.82,
          maxDrawdown: 12.3,
          bestDay: {
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            value: 2800,
            percent: 3.2
          },
          worstDay: {
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            value: -2200,
            percent: -2.8
          }
        },
        returns: {
          oneDay: 0.8,
          oneWeek: 2.1,
          oneMonth: 5.5,
          threeMonths: 8.2,
          sixMonths: 12.8,
          oneYear: 18.5,
          allTime: 9.44
        },
        topGainers: [
          { symbol: 'TCS', profitLoss: 3500, profitLossPercent: 17.5, currentValue: 23500 },
          { symbol: 'INFY', profitLoss: 2200, profitLossPercent: 14.7, currentValue: 17200 },
          { symbol: 'HDFCBANK', profitLoss: 1800, profitLossPercent: 10.0, currentValue: 19800 }
        ],
        topLosers: [
          { symbol: 'WIPRO', profitLoss: -800, profitLossPercent: -8.0, currentValue: 9200 },
          { symbol: 'ICICIBANK', profitLoss: -400, profitLossPercent: -3.3, currentValue: 11600 }
        ],
        sectorPerformance: [
          {
            sector: 'Technology',
            allocation: 35.0,
            profitLoss: 4200,
            profitLossPercent: 12.0,
            topStock: 'TCS'
          },
          {
            sector: 'Banking & Financial',
            allocation: 30.0,
            profitLoss: 1400,
            profitLossPercent: 4.7,
            topStock: 'HDFCBANK'
          },
          {
            sector: 'Energy',
            allocation: 20.0,
            profitLoss: 2000,
            profitLossPercent: 10.0,
            topStock: 'RELIANCE'
          },
          {
            sector: 'Healthcare',
            allocation: 10.0,
            profitLoss: 600,
            profitLossPercent: 6.0,
            topStock: 'DRREDDYS'
          },
          {
            sector: 'Consumer Goods',
            allocation: 5.0,
            profitLoss: 300,
            profitLossPercent: 6.0,
            topStock: 'HUL'
          }
        ],
        riskMetrics: {
          portfolioConcentration: 0.25, // 25% concentration
          diversificationScore: 75, // Good diversification
          avgHoldingPeriod: 45, // 45 days average
          turnoverRatio: 0.8 // Moderate turnover
        }
      };

      await PortfolioAnalytics.findOneAndUpdate(
        { userId },
        analytics,
        { upsert: true, new: true }
      );
      
      console.log(`✅ Generated sample analytics for user ${userId}`);
      return analytics;
    } catch (error) {
      console.error('Error generating sample analytics:', error);
      throw error;
    }
  }

  /**
   * Generate complete demo data for a user
   */
  async generateCompleteDemo(userId, days = 30) {
    try {
      console.log(`🎬 Generating complete demo data for user ${userId}`);
      
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Clear existing data first
      await this.clearExistingData(userId);

      // Generate all demo data
      const [snapshots, milestones, analytics] = await Promise.all([
        this.generateSampleSnapshots(userId, days),
        this.generateSampleMilestones(userId),
        this.generateSampleAnalytics(userId)
      ]);

      console.log(`✅ Complete demo data generated successfully!`);
      console.log(`   • Snapshots: ${snapshots.length}`);
      console.log(`   • Milestones: ${milestones.length}`);
      console.log(`   • Analytics: Generated`);

      return {
        snapshots,
        milestones,
        analytics
      };
    } catch (error) {
      console.error('Error generating complete demo data:', error);
      throw error;
    }
  }

  /**
   * Clear existing demo data for a user
   */
  async clearExistingData(userId) {
    try {
      console.log(`🧹 Clearing existing demo data for user ${userId}`);
      
      await Promise.all([
        PortfolioSnapshot.deleteMany({ userId }),
        PerformanceMilestone.deleteMany({ userId }),
        PortfolioAnalytics.deleteMany({ userId })
      ]);
      
      console.log(`✅ Existing demo data cleared`);
    } catch (error) {
      console.error('Error clearing existing data:', error);
      throw error;
    }
  }

  /**
   * Get demo data summary for a user
   */
  async getDemoDataSummary(userId) {
    try {
      const [snapshotCount, milestoneCount, analyticsExists] = await Promise.all([
        PortfolioSnapshot.countDocuments({ userId }),
        PerformanceMilestone.countDocuments({ userId }),
        PortfolioAnalytics.exists({ userId })
      ]);

      return {
        userId,
        snapshots: snapshotCount,
        milestones: milestoneCount,
        analytics: !!analyticsExists,
        hasCompleteData: snapshotCount > 0 && milestoneCount > 0 && analyticsExists
      };
    } catch (error) {
      console.error('Error getting demo data summary:', error);
      throw error;
    }
  }
}

module.exports = new PortfolioIntelligenceDemoData();
