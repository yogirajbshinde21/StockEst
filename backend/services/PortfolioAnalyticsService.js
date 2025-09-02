const { PortfolioSnapshot, PerformanceMilestone, PortfolioAnalytics } = require('../models/PortfolioAnalytics');
const User = require('../models/User');
const stockDataService = require('./stockDataService');

class PortfolioAnalyticsService {
  
  /**
   * Create daily portfolio snapshot
   */
  async createDailySnapshot(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if snapshot already exists for today
      const existingSnapshot = await PortfolioSnapshot.findOne({
        userId,
        date: today
      });

      if (existingSnapshot) {
        return await this.updateDailySnapshot(userId, today);
      }

      // Calculate portfolio metrics
      const portfolioMetrics = await this.calculatePortfolioMetrics(user);
      const sectorAllocation = await this.calculateSectorAllocation(user.portfolio);
      
      // Get previous day's snapshot for comparison
      const previousSnapshot = await PortfolioSnapshot.findOne({
        userId,
        date: { $lt: today }
      }).sort({ date: -1 });

      const dayChange = previousSnapshot ? 
        portfolioMetrics.totalValue - previousSnapshot.totalValue : 0;
      const dayChangePercent = previousSnapshot && previousSnapshot.totalValue > 0 ? 
        ((portfolioMetrics.totalValue - previousSnapshot.totalValue) / previousSnapshot.totalValue) * 100 : 0;

      // Create new snapshot
      const snapshot = new PortfolioSnapshot({
        userId,
        date: today,
        totalValue: portfolioMetrics.totalValue,
        totalInvested: portfolioMetrics.totalInvested,
        totalProfitLoss: portfolioMetrics.totalProfitLoss,
        totalProfitLossPercent: portfolioMetrics.totalProfitLossPercent,
        cashBalance: user.virtualBalance,
        holdings: portfolioMetrics.holdings,
        sectorAllocation,
        dayChange,
        dayChangePercent,
        milestones: []
      });

      await snapshot.save();
      
      // Check for milestones
      await this.checkMilestones(userId, snapshot);
      
      return snapshot;
    } catch (error) {
      console.error('Error creating daily snapshot:', error);
      throw error;
    }
  }

  /**
   * Update existing daily snapshot
   */
  async updateDailySnapshot(userId, date) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const portfolioMetrics = await this.calculatePortfolioMetrics(user);
      const sectorAllocation = await this.calculateSectorAllocation(user.portfolio);

      // Get previous day's snapshot for comparison
      const previousSnapshot = await PortfolioSnapshot.findOne({
        userId,
        date: { $lt: date }
      }).sort({ date: -1 });

      const dayChange = previousSnapshot ? 
        portfolioMetrics.totalValue - previousSnapshot.totalValue : 0;
      const dayChangePercent = previousSnapshot && previousSnapshot.totalValue > 0 ? 
        ((portfolioMetrics.totalValue - previousSnapshot.totalValue) / previousSnapshot.totalValue) * 100 : 0;

      const snapshot = await PortfolioSnapshot.findOneAndUpdate(
        { userId, date },
        {
          totalValue: portfolioMetrics.totalValue,
          totalInvested: portfolioMetrics.totalInvested,
          totalProfitLoss: portfolioMetrics.totalProfitLoss,
          totalProfitLossPercent: portfolioMetrics.totalProfitLossPercent,
          cashBalance: user.virtualBalance,
          holdings: portfolioMetrics.holdings,
          sectorAllocation,
          dayChange,
          dayChangePercent
        },
        { new: true }
      );

      return snapshot;
    } catch (error) {
      console.error('Error updating daily snapshot:', error);
      throw error;
    }
  }

  /**
   * Calculate portfolio metrics
   */
  async calculatePortfolioMetrics(user) {
    const holdings = [];
    let totalValue = 0;
    let totalInvested = 0;

    for (const holding of user.portfolio) {
      const currentValue = holding.quantity * holding.currentPrice;
      const profitLoss = currentValue - holding.totalInvested;
      const profitLossPercent = holding.totalInvested > 0 ? 
        (profitLoss / holding.totalInvested) * 100 : 0;

      holdings.push({
        symbol: holding.symbol,
        instrumentKey: holding.instrumentKey,
        quantity: holding.quantity,
        currentPrice: holding.currentPrice,
        currentValue,
        profitLoss,
        profitLossPercent,
        weightage: 0 // Will be calculated after total value
      });

      totalValue += currentValue;
      totalInvested += holding.totalInvested;
    }

    // Calculate weightage
    holdings.forEach(holding => {
      holding.weightage = totalValue > 0 ? (holding.currentValue / totalValue) * 100 : 0;
    });

    const totalProfitLoss = totalValue - totalInvested;
    const totalProfitLossPercent = totalInvested > 0 ? 
      (totalProfitLoss / totalInvested) * 100 : 0;

    return {
      totalValue,
      totalInvested,
      totalProfitLoss,
      totalProfitLossPercent,
      holdings
    };
  }

  /**
   * Calculate sector allocation
   */
  async calculateSectorAllocation(portfolio) {
    const sectorMap = new Map();
    let totalValue = 0;

    for (const holding of portfolio) {
      const currentValue = holding.quantity * holding.currentPrice;
      totalValue += currentValue;

      // Get sector info from stock service
      try {
        const stockInfo = await stockDataService.getStockByInstrumentKey(holding.instrumentKey);
        const sector = stockInfo?.sector || 'Others';
        
        if (sectorMap.has(sector)) {
          sectorMap.set(sector, sectorMap.get(sector) + currentValue);
        } else {
          sectorMap.set(sector, currentValue);
        }
      } catch (error) {
        // Default to Others if can't get sector info
        const sector = 'Others';
        if (sectorMap.has(sector)) {
          sectorMap.set(sector, sectorMap.get(sector) + currentValue);
        } else {
          sectorMap.set(sector, currentValue);
        }
      }
    }

    const sectorAllocation = Array.from(sectorMap.entries()).map(([sector, value]) => ({
      sector,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
    }));

    return sectorAllocation.sort((a, b) => b.percentage - a.percentage);
  }

  /**
   * Check for performance milestones
   */
  async checkMilestones(userId, snapshot) {
    const milestones = [];
    
    // Profit milestones
    const profitMilestones = [1000, 5000, 10000, 25000, 50000, 100000];
    for (const milestone of profitMilestones) {
      if (snapshot.totalProfitLoss >= milestone) {
        const existing = await PerformanceMilestone.findOne({
          userId,
          type: `PROFIT_${milestone / 1000}K`
        });
        
        if (!existing) {
          const newMilestone = new PerformanceMilestone({
            userId,
            type: `PROFIT_${milestone / 1000}K`,
            value: milestone,
            description: `Achieved ₹${milestone.toLocaleString('en-IN')} in total profits!`
          });
          await newMilestone.save();
          milestones.push(newMilestone);
        }
      }
    }

    // Portfolio value milestones
    const valueMilestones = [100000, 500000, 1000000];
    for (const milestone of valueMilestones) {
      if (snapshot.totalValue >= milestone) {
        const existing = await PerformanceMilestone.findOne({
          userId,
          type: `PORTFOLIO_VALUE_${milestone / 100000 === 1 ? '100K' : milestone / 100000 === 5 ? '500K' : '1M'}`
        });
        
        if (!existing) {
          const newMilestone = new PerformanceMilestone({
            userId,
            type: `PORTFOLIO_VALUE_${milestone / 100000 === 1 ? '100K' : milestone / 100000 === 5 ? '500K' : '1M'}`,
            value: milestone,
            description: `Portfolio value reached ₹${milestone.toLocaleString('en-IN')}!`
          });
          await newMilestone.save();
          milestones.push(newMilestone);
        }
      }
    }

    return milestones;
  }

  /**
   * Get portfolio performance timeline
   */
  async getPerformanceTimeline(userId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const snapshots = await PortfolioSnapshot.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });

      return snapshots.map(snapshot => ({
        date: snapshot.date,
        totalValue: snapshot.totalValue,
        totalInvested: snapshot.totalInvested,
        totalProfitLoss: snapshot.totalProfitLoss,
        totalProfitLossPercent: snapshot.totalProfitLossPercent,
        dayChange: snapshot.dayChange,
        dayChangePercent: snapshot.dayChangePercent
      }));
    } catch (error) {
      console.error('Error getting performance timeline:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive portfolio analytics
   */
  async calculatePortfolioAnalytics(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Get historical snapshots
      const snapshots = await PortfolioSnapshot.find({ userId })
        .sort({ date: 1 });

      if (snapshots.length === 0) {
        // Create initial analytics for new users
        return this.createInitialAnalytics(userId, user);
      }

      const analytics = await this.calculateAdvancedMetrics(userId, snapshots, user);
      
      // Save or update analytics
      await PortfolioAnalytics.findOneAndUpdate(
        { userId },
        analytics,
        { upsert: true, new: true }
      );

      return analytics;
    } catch (error) {
      console.error('Error calculating portfolio analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate advanced portfolio metrics
   */
  async calculateAdvancedMetrics(userId, snapshots, user) {
    const returns = this.calculateReturns(snapshots);
    const performance = this.calculatePerformanceMetrics(snapshots);
    const topGainers = this.getTopPerformers(user.portfolio, true);
    const topLosers = this.getTopPerformers(user.portfolio, false);
    const sectorPerformance = await this.calculateSectorPerformance(user.portfolio);
    const riskMetrics = this.calculateRiskMetrics(snapshots, user);

    return {
      userId,
      lastUpdated: new Date(),
      performance,
      returns,
      topGainers,
      topLosers,
      sectorPerformance,
      riskMetrics
    };
  }

  /**
   * Calculate returns for different time periods
   */
  calculateReturns(snapshots) {
    if (snapshots.length === 0) return {};

    const current = snapshots[snapshots.length - 1];
    const returns = {};

    // Helper function to find snapshot closest to target date
    const findSnapshotByDaysAgo = (days) => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - days);
      
      return snapshots.reduce((closest, snapshot) => {
        const snapshotDate = new Date(snapshot.date);
        const closestDate = new Date(closest.date);
        
        return Math.abs(snapshotDate - targetDate) < Math.abs(closestDate - targetDate) 
          ? snapshot : closest;
      });
    };

    // Calculate returns for different periods
    const periods = [
      { key: 'oneDay', days: 1 },
      { key: 'oneWeek', days: 7 },
      { key: 'oneMonth', days: 30 },
      { key: 'threeMonths', days: 90 },
      { key: 'sixMonths', days: 180 },
      { key: 'oneYear', days: 365 }
    ];

    periods.forEach(({ key, days }) => {
      if (snapshots.length > days) {
        const pastSnapshot = findSnapshotByDaysAgo(days);
        if (pastSnapshot && pastSnapshot.totalValue > 0) {
          returns[key] = ((current.totalValue - pastSnapshot.totalValue) / pastSnapshot.totalValue) * 100;
        } else {
          returns[key] = 0;
        }
      } else {
        returns[key] = current.totalProfitLossPercent || 0;
      }
    });

    // All-time return
    const firstSnapshot = snapshots[0];
    returns.allTime = firstSnapshot && firstSnapshot.totalValue > 0 ? 
      ((current.totalValue - firstSnapshot.totalValue) / firstSnapshot.totalValue) * 100 : 0;

    return returns;
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics(snapshots) {
    if (snapshots.length === 0) return {};

    const values = snapshots.map(s => s.totalValue);
    const dailyReturns = [];
    
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > 0) {
        dailyReturns.push((values[i] - values[i - 1]) / values[i - 1]);
      }
    }

    const totalReturn = snapshots.length > 0 ? 
      snapshots[snapshots.length - 1].totalProfitLoss : 0;
    const totalReturnPercent = snapshots.length > 0 ? 
      snapshots[snapshots.length - 1].totalProfitLossPercent : 0;

    // Calculate volatility (standard deviation of daily returns)
    const avgReturn = dailyReturns.length > 0 ? 
      dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length : 0;
    const volatility = dailyReturns.length > 1 ? 
      Math.sqrt(dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / (dailyReturns.length - 1)) * Math.sqrt(252) * 100 : 0;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = values[0] || 0;
    
    values.forEach(value => {
      if (value > peak) peak = value;
      const drawdown = peak > 0 ? ((peak - value) / peak) * 100 : 0;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    // Find best and worst days
    let bestDay = { date: null, value: 0, percent: 0 };
    let worstDay = { date: null, value: 0, percent: 0 };
    
    snapshots.forEach(snapshot => {
      if (snapshot.dayChangePercent > bestDay.percent) {
        bestDay = {
          date: snapshot.date,
          value: snapshot.dayChange,
          percent: snapshot.dayChangePercent
        };
      }
      if (snapshot.dayChangePercent < worstDay.percent) {
        worstDay = {
          date: snapshot.date,
          value: snapshot.dayChange,
          percent: snapshot.dayChangePercent
        };
      }
    });

    // Calculate Sharpe ratio (simplified, assuming risk-free rate of 6%)
    const riskFreeRate = 0.06;
    const excessReturn = (totalReturnPercent / 100) - riskFreeRate;
    const sharpeRatio = volatility > 0 ? excessReturn / (volatility / 100) : 0;

    return {
      totalReturn,
      totalReturnPercent,
      volatility,
      sharpeRatio,
      maxDrawdown,
      bestDay,
      worstDay
    };
  }

  /**
   * Get top performing stocks
   */
  getTopPerformers(portfolio, isGainers = true) {
    return portfolio
      .map(holding => ({
        symbol: holding.symbol,
        profitLoss: holding.profitLoss || 0,
        profitLossPercent: holding.profitLossPercent || 0,
        currentValue: holding.currentValue || 0
      }))
      .filter(holding => isGainers ? holding.profitLoss >= 0 : holding.profitLoss < 0)
      .sort((a, b) => isGainers ? b.profitLoss - a.profitLoss : a.profitLoss - b.profitLoss)
      .slice(0, 5);
  }

  /**
   * Calculate sector performance
   */
  async calculateSectorPerformance(portfolio) {
    const sectorMap = new Map();
    let totalValue = 0;

    for (const holding of portfolio) {
      const currentValue = holding.currentValue || 0;
      const profitLoss = holding.profitLoss || 0;
      totalValue += currentValue;

      try {
        const stockInfo = await stockDataService.getStockByInstrumentKey(holding.instrumentKey);
        const sector = stockInfo?.sector || 'Others';
        
        if (sectorMap.has(sector)) {
          const existing = sectorMap.get(sector);
          sectorMap.set(sector, {
            allocation: existing.allocation + currentValue,
            profitLoss: existing.profitLoss + profitLoss,
            stocks: [...existing.stocks, { symbol: holding.symbol, profitLoss }]
          });
        } else {
          sectorMap.set(sector, {
            allocation: currentValue,
            profitLoss,
            stocks: [{ symbol: holding.symbol, profitLoss }]
          });
        }
      } catch (error) {
        const sector = 'Others';
        if (sectorMap.has(sector)) {
          const existing = sectorMap.get(sector);
          sectorMap.set(sector, {
            allocation: existing.allocation + currentValue,
            profitLoss: existing.profitLoss + profitLoss,
            stocks: [...existing.stocks, { symbol: holding.symbol, profitLoss }]
          });
        } else {
          sectorMap.set(sector, {
            allocation: currentValue,
            profitLoss,
            stocks: [{ symbol: holding.symbol, profitLoss }]
          });
        }
      }
    }

    return Array.from(sectorMap.entries()).map(([sector, data]) => {
      const topStock = data.stocks.reduce((best, stock) => 
        stock.profitLoss > best.profitLoss ? stock : best
      );
      
      return {
        sector,
        allocation: totalValue > 0 ? (data.allocation / totalValue) * 100 : 0,
        profitLoss: data.profitLoss,
        profitLossPercent: data.allocation > 0 ? (data.profitLoss / data.allocation) * 100 : 0,
        topStock: topStock.symbol
      };
    }).sort((a, b) => b.allocation - a.allocation);
  }

  /**
   * Calculate risk metrics
   */
  calculateRiskMetrics(snapshots, user) {
    const portfolio = user.portfolio || [];
    
    // Portfolio concentration (Herfindahl index)
    const totalValue = portfolio.reduce((sum, holding) => sum + (holding.currentValue || 0), 0);
    const concentration = totalValue > 0 ? 
      portfolio.reduce((sum, holding) => {
        const weight = (holding.currentValue || 0) / totalValue;
        return sum + (weight * weight);
      }, 0) : 0;

    // Diversification score (inverse of concentration, scaled to 100)
    const diversificationScore = Math.max(0, (1 - concentration) * 100);

    // Average holding period (simplified calculation)
    const avgHoldingPeriod = user.transactions?.length > 0 ? 
      user.transactions.reduce((sum, transaction) => {
        const days = (new Date() - new Date(transaction.timestamp)) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / user.transactions.length : 0;

    // Turnover ratio (simplified)
    const totalTransactionValue = user.transactions?.reduce((sum, transaction) => 
      sum + (transaction.totalAmount || 0), 0) || 0;
    const turnoverRatio = totalValue > 0 ? totalTransactionValue / totalValue : 0;

    return {
      portfolioConcentration: concentration,
      diversificationScore,
      avgHoldingPeriod,
      turnoverRatio
    };
  }

  /**
   * Create initial analytics for new users
   */
  createInitialAnalytics(userId, user) {
    return {
      userId,
      lastUpdated: new Date(),
      performance: {
        totalReturn: 0,
        totalReturnPercent: 0,
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        bestDay: { date: null, value: 0, percent: 0 },
        worstDay: { date: null, value: 0, percent: 0 }
      },
      returns: {
        oneDay: 0,
        oneWeek: 0,
        oneMonth: 0,
        threeMonths: 0,
        sixMonths: 0,
        oneYear: 0,
        allTime: 0
      },
      topGainers: [],
      topLosers: [],
      sectorPerformance: [],
      riskMetrics: {
        portfolioConcentration: 0,
        diversificationScore: 100,
        avgHoldingPeriod: 0,
        turnoverRatio: 0
      }
    };
  }

  /**
   * Get performance milestones for user
   */
  async getPerformanceMilestones(userId, limit = 10) {
    try {
      return await PerformanceMilestone.find({ userId })
        .sort({ achievedAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error getting performance milestones:', error);
      throw error;
    }
  }
}

module.exports = new PortfolioAnalyticsService();
