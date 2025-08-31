const express = require('express');
const router = express.Router();
const HistoricalDataService = require('../services/HistoricalDataService');
const { auth } = require('../middleware/auth');

// Get historical data for a specific company and time interval
router.get('/historical/:symbol/:interval?', auth, async (req, res) => {
  try {
    const { symbol, interval = '1M' } = req.params;
    
    const data = await HistoricalDataService.getHistoricalData(
      symbol.toUpperCase(), 
      interval.toUpperCase()
    );
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch historical data',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get historical data for all companies
router.get('/historical-all/:interval?', auth, async (req, res) => {
  try {
    const { interval = '1M' } = req.params;
    const companies = HistoricalDataService.getAvailableCompanies();
    
    const allData = await Promise.allSettled(
      companies.map(company => 
        HistoricalDataService.getHistoricalData(company.symbol, interval.toUpperCase())
      )
    );

    const results = allData.map((result, index) => ({
      symbol: companies[index].symbol,
      companyName: companies[index].companyName,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));

    res.json({
      success: true,
      data: results,
      interval: interval.toUpperCase()
    });
  } catch (error) {
    console.error('Error fetching all historical data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch historical data for all companies',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get available companies
router.get('/companies', auth, (req, res) => {
  try {
    const companies = HistoricalDataService.getAvailableCompanies();
    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get available companies'
    });
  }
});

// Get available time intervals
router.get('/intervals', auth, (req, res) => {
  try {
    const intervals = HistoricalDataService.getAvailableIntervals();
    res.json({
      success: true,
      data: intervals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get available intervals'
    });
  }
});

// Manual refresh for specific company and interval (admin only)
router.post('/refresh/:symbol/:interval', auth, async (req, res) => {
  try {
    const { symbol, interval } = req.params;
    
    // Force refresh by fetching new data
    const data = await HistoricalDataService.getHistoricalData(
      symbol.toUpperCase(), 
      interval.toUpperCase()
    );
    
    res.json({
      success: true,
      message: 'Data refreshed successfully',
      data
    });
  } catch (error) {
    console.error('Error refreshing data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh data',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Bulk refresh all data (admin only)
router.post('/refresh-all', auth, async (req, res) => {
  try {
    // Start bulk refresh in background
    HistoricalDataService.bulkRefreshData().catch(error => {
      console.error('Background bulk refresh failed:', error);
    });
    
    res.json({
      success: true,
      message: 'Bulk refresh started in background'
    });
  } catch (error) {
    console.error('Error starting bulk refresh:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start bulk refresh'
    });
  }
});

module.exports = router;
