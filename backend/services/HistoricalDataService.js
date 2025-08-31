const axios = require('axios');
const HistoricalCandle = require('../models/HistoricalCandle');

class HistoricalDataService {
  constructor() {
    this.baseURL = 'https://api.upstox.com/v3';
    
    // Company mappings with instrument keys
    this.companies = {
      'RELIANCE': {
        instrumentKey: 'NSE_EQ|INE002A01018',
        companyName: 'Reliance Industries Limited'
      },
      'TCS': {
        instrumentKey: 'NSE_EQ|INE467B01029',
        companyName: 'Tata Consultancy Services Limited'
      },
      'INFY': {
        instrumentKey: 'NSE_EQ|INE009A01021',
        companyName: 'Infosys Limited'
      },
      'HDFCBANK': {
        instrumentKey: 'NSE_EQ|INE040A01034',
        companyName: 'HDFC Bank Limited'
      }
    };

    // Interval configurations with date range limits
    this.intervalConfigs = {
      '1M': { unit: 'days', interval: '1', months: 1 },
      '3M': { unit: 'days', interval: '1', months: 3 },
      '6M': { unit: 'days', interval: '1', months: 6 },
      '1Y': { unit: 'weeks', interval: '1', months: 12 },
      'MAX': { unit: 'months', interval: '1', months: 60 } // 5 years max
    };
  }

  /**
   * Get historical data for a company and time interval
   * @param {string} symbol - Stock symbol (RELIANCE, TCS, etc.)
   * @param {string} timeInterval - Time interval (1M, 3M, 6M, 1Y, MAX)
   * @returns {Promise<Object>} Historical candle data with analysis
   */
  async getHistoricalData(symbol, timeInterval = '1M') {
    try {
      // Validate inputs
      if (!this.companies[symbol]) {
        throw new Error(`Unsupported symbol: ${symbol}`);
      }
      
      if (!this.intervalConfigs[timeInterval]) {
        throw new Error(`Unsupported time interval: ${timeInterval}`);
      }

      const company = this.companies[symbol];
      const config = this.intervalConfigs[timeInterval];
      
      // Calculate date range
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setMonth(fromDate.getMonth() - config.months);
      
      const toDateStr = toDate.toISOString().split('T')[0];
      const fromDateStr = fromDate.toISOString().split('T')[0];
      
      // Generate data key for caching
      const dataKey = HistoricalCandle.generateDataKey(
        symbol, 
        config.unit, 
        config.interval, 
        fromDateStr, 
        toDateStr
      );

      // Check if we have cached data
      let cachedData = await HistoricalCandle.findOne({ dataKey });
      
      if (cachedData && cachedData.isFresh()) {
        console.log(`Using cached data for ${symbol} ${timeInterval}`);
        return this.formatResponse(cachedData);
      }

      // Fetch fresh data from Upstox API
      console.log(`Fetching fresh data for ${symbol} ${timeInterval}`);
      const apiData = await this.fetchFromUpstox(
        company.instrumentKey,
        config.unit,
        config.interval,
        toDateStr,
        fromDateStr
      );

      // Save or update cached data
      const candleData = {
        symbol,
        instrumentKey: company.instrumentKey,
        companyName: company.companyName,
        unit: config.unit,
        interval: config.interval,
        fromDate: fromDateStr,
        toDate: toDateStr,
        candles: apiData.candles,
        dataKey,
        lastUpdated: new Date()
      };

      if (cachedData) {
        // Update existing record
        Object.assign(cachedData, candleData);
        cachedData.analyzeData();
        await cachedData.save();
        return this.formatResponse(cachedData);
      } else {
        // Create new record
        const newRecord = new HistoricalCandle(candleData);
        newRecord.analyzeData();
        await newRecord.save();
        return this.formatResponse(newRecord);
      }

    } catch (error) {
      console.error('Error getting historical data:', error);
      throw error;
    }
  }

  /**
   * Fetch data from Upstox API with retry and error handling
   * @param {string} instrumentKey - Instrument key
   * @param {string} unit - Time unit
   * @param {string} interval - Interval
   * @param {string} toDate - End date
   * @param {string} fromDate - Start date
   * @returns {Promise<Object>} API response data
   */
  async fetchFromUpstox(instrumentKey, unit, interval, toDate, fromDate) {
    const url = `${this.baseURL}/historical-candle/${encodeURIComponent(instrumentKey)}/${unit}/${interval}/${toDate}/${fromDate}`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      if (response.data.status !== 'success') {
        throw new Error('API returned error status');
      }

      // Transform candles data
      const candles = response.data.data.candles.map(candle => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
        openInterest: candle[6]
      }));

      return { candles };

    } catch (error) {
      if (error.response && error.response.status === 400) {
        // Handle record limit exceeded - try with reduced range
        console.log('Record limit exceeded, trying with reduced range...');
        return await this.fetchWithReducedRange(instrumentKey, unit, interval, toDate, fromDate);
      }
      throw error;
    }
  }

  /**
   * Fetch with reduced date range when limit exceeded
   */
  async fetchWithReducedRange(instrumentKey, unit, interval, toDate, fromDate) {
    const originalFromDate = new Date(fromDate);
    const toDateObj = new Date(toDate);
    
    // Reduce range by half
    const reducedFromDate = new Date(originalFromDate);
    const daysDiff = Math.floor((toDateObj - originalFromDate) / (1000 * 60 * 60 * 24));
    reducedFromDate.setDate(reducedFromDate.getDate() + Math.floor(daysDiff / 2));
    
    const reducedFromDateStr = reducedFromDate.toISOString().split('T')[0];
    
    console.log(`Retrying with reduced range: ${reducedFromDateStr} to ${toDate}`);
    
    return await this.fetchFromUpstox(instrumentKey, unit, interval, toDate, reducedFromDateStr);
  }

  /**
   * Format response for frontend consumption
   */
  formatResponse(candleData) {
    return {
      symbol: candleData.symbol,
      companyName: candleData.companyName,
      timeRange: {
        from: candleData.fromDate,
        to: candleData.toDate,
        unit: candleData.unit,
        interval: candleData.interval
      },
      candles: candleData.candles,
      analysis: candleData.analysis,
      lastUpdated: candleData.lastUpdated,
      dataAge: this.getDataAge(candleData.lastUpdated)
    };
  }

  /**
   * Get human-readable data age
   */
  getDataAge(lastUpdated) {
    const now = new Date();
    const diffMs = now - lastUpdated;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return 'Just updated';
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} days ago`;
    }
  }

  /**
   * Bulk refresh data for all companies and common intervals
   * Used by cron job
   */
  async bulkRefreshData() {
    const companies = Object.keys(this.companies);
    const intervals = ['1M', '3M', '6M', '1Y'];
    
    console.log('Starting bulk refresh of historical data...');
    
    for (const symbol of companies) {
      for (const interval of intervals) {
        try {
          await this.getHistoricalData(symbol, interval);
          console.log(`✓ Refreshed ${symbol} ${interval}`);
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`✗ Failed to refresh ${symbol} ${interval}:`, error.message);
        }
      }
    }
    
    console.log('Bulk refresh completed');
  }

  /**
   * Get all available companies
   */
  getAvailableCompanies() {
    return Object.keys(this.companies).map(symbol => ({
      symbol,
      companyName: this.companies[symbol].companyName,
      instrumentKey: this.companies[symbol].instrumentKey
    }));
  }

  /**
   * Get all available time intervals
   */
  getAvailableIntervals() {
    return Object.keys(this.intervalConfigs).map(key => ({
      key,
      label: key === 'MAX' ? 'All Time' : key,
      config: this.intervalConfigs[key]
    }));
  }
}

module.exports = new HistoricalDataService();
