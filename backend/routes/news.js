const express = require('express');
const newsService = require('../services/newsService');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @route GET /api/news/latest
 * @desc Get latest financial news
 * @access Private
 */
router.get('/latest', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    console.log(`📰 User ${req.user.email} requesting ${limit} latest news`);
    
    const news = await newsService.getLatestNews(limit);
    
    res.json({
      success: true,
      data: news,
      count: news.length,
      message: `Latest ${news.length} news articles fetched`
    });
  } catch (error) {
    console.error('❌ Error fetching latest news:', error.message);
    res.status(500).json({
      success: false,
      message: 'समाचार लाने में त्रुटि - Error fetching news',
      error: error.message
    });
  }
});

/**
 * @route GET /api/news/stock/:symbol
 * @desc Get news for specific stock
 * @access Private
 */
router.get('/stock/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    
    const validSymbols = ['RELIANCE', 'INFY', 'TCS', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'WIPRO', 'ITC', 'BHARTIARTL', 'KOTAKBANK'];
    if (!validSymbols.includes(symbol.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `अमान्य स्टॉक सिंबल - Invalid stock symbol. Valid: ${validSymbols.join(', ')}`
      });
    }
    
    console.log(`📈 User ${req.user.email} requesting news for ${symbol}`);
    
    const news = await newsService.getNewsForStock(symbol.toUpperCase(), limit);
    
    res.json({
      success: true,
      data: news,
      stock: symbol.toUpperCase(),
      count: news.length,
      message: `${symbol} के लिए ${news.length} समाचार - ${news.length} news for ${symbol}`
    });
  } catch (error) {
    console.error(`❌ Error fetching news for ${req.params.symbol}:`, error.message);
    res.status(500).json({
      success: false,
      message: `${req.params.symbol} के समाचार में त्रुटि - Error fetching news for ${req.params.symbol}`,
      error: error.message
    });
  }
});

/**
 * @route GET /api/news/stats
 * @desc Get news service statistics
 * @access Private
 */
router.get('/stats', auth, async (req, res) => {
  try {
    console.log(`📊 User ${req.user.email} requesting news statistics`);
    
    const stats = await newsService.getServiceStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'News service statistics'
    });
  } catch (error) {
    console.error('❌ Error fetching news stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'आंकड़े लाने में त्रुटि - Error fetching statistics',
      error: error.message
    });
  }
});

/**
 * @route POST /api/news/refresh
 * @desc Manually trigger news refresh (admin only)
 * @access Private (Admin)
 */
router.post('/refresh', auth, async (req, res) => {
  try {
    // Simple admin check - you can enhance this based on your user model
    if (req.user.email !== 'admin@stockest.com' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'केवल एडमिन पहुंच - Admin access only'
      });
    }
    
    console.log(`🔄 Admin ${req.user.email} triggered manual news refresh`);
    
    const result = await newsService.processAndStoreNews();
    
    res.json({
      success: result.success,
      data: result,
      message: result.success ? 
        'समाचार सफलतापूर्वक अपडेट - News updated successfully' : 
        'समाचार अपडेट में त्रुटि - Error updating news'
    });
  } catch (error) {
    console.error('❌ Error during manual news refresh:', error.message);
    res.status(500).json({
      success: false,
      message: 'समाचार रिफ्रेश में त्रुटि - Error refreshing news',
      error: error.message
    });
  }
});

/**
 * @route GET /api/news/portfolio-impact
 * @desc Get news that affects user's portfolio stocks
 * @access Private
 */
router.get('/portfolio-impact', auth, async (req, res) => {
  try {
    console.log(`💼 User ${req.user.email} requesting portfolio impact news`);
    
    // Get user's portfolio stocks
    const user = req.user;
    const portfolioSymbols = user.portfolio ? user.portfolio.map(p => p.symbol) : [];
    
    if (portfolioSymbols.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'कोई पोर्टफोलियो स्टॉक नहीं - No portfolio stocks found'
      });
    }
    
    // Get all recent news and filter for portfolio stocks
    const allNews = await newsService.getLatestNews(50);
    const portfolioNews = allNews.filter(news => 
      news.affectedStocks.some(stock => portfolioSymbols.includes(stock.symbol))
    ).slice(0, 10);
    
    res.json({
      success: true,
      data: portfolioNews,
      portfolioStocks: portfolioSymbols,
      count: portfolioNews.length,
      message: `आपके पोर्टफोलियो को प्रभावित करने वाले ${portfolioNews.length} समाचार - ${portfolioNews.length} news affecting your portfolio`
    });
  } catch (error) {
    console.error('❌ Error fetching portfolio impact news:', error.message);
    res.status(500).json({
      success: false,
      message: 'पोर्टफोलियो समाचार में त्रुटि - Error fetching portfolio news',
      error: error.message
    });
  }
});

/**
 * @route GET /api/news/summary
 * @desc Get news summary for dashboard
 * @access Private
 */
router.get('/summary', auth, async (req, res) => {
  try {
    console.log(`📋 User ${req.user.email} requesting news summary`);
    
    const [latestNews, stats] = await Promise.all([
      newsService.getLatestNews(3),
      newsService.getServiceStats()
    ]);
    
    const summary = {
      latest: latestNews,
      stats: stats,
      highlights: latestNews.map(news => ({
        content: news.content.substring(0, 150) + '...',
        affectedStocksCount: news.affectedStocks.length,
        publishedAt: news.publishedAt,
        id: news._id
      }))
    };
    
    res.json({
      success: true,
      data: summary,
      message: 'News summary for dashboard'
    });
  } catch (error) {
    console.error('❌ Error fetching news summary:', error.message);
    res.status(500).json({
      success: false,
      message: 'समाचार सारांश में त्रुटि - Error fetching news summary',
      error: error.message
    });
  }
});

module.exports = router;
