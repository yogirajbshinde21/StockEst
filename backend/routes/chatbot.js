const express = require('express');
const chatbotService = require('../services/ChatbotService');
const { auth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for chatbot API
const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each user to 20 requests per windowMs
  message: {
    success: false,
    message: 'Too many chatbot requests, please try again later.',
    messageHi: 'बहुत सारे अनुरोध, कृपया बाद में कोशिश करें।'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/chatbot/query
 * Process user query with Gemini AI
 */
router.post('/query', auth, chatbotLimiter, async (req, res) => {
  try {
    const { query, language } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required',
        messageHi: 'प्रश्न आवश्यक है'
      });
    }

    if (query.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Query too long (max 500 characters)',
        messageHi: 'प्रश्न बहुत लंबा है (अधिकतम 500 अक्षर)'
      });
    }

    console.log(`🤖 Chatbot query from user ${userId}: "${query.substring(0, 50)}..."`);

    // Generate response using ChatbotService
    const response = await chatbotService.generateResponse(query, userId, language);

    // Log the interaction
    console.log(`✅ Chatbot response generated for user ${userId}`);

    res.json({
      success: true,
      data: {
        query: query,
        response: response.text,
        sources: response.sources,
        isRelevant: response.isRelevant,
        timestamp: new Date().toISOString(),
        language: language,
        cacheUsed: response.cacheUsed || false,
        memoryContext: response.memoryContext || 0,
        portfolioFetched: response.portfolioFetched || false,
        portfolioRequired: response.portfolioRequired || false,
        queryType: response.queryType || 'unknown',
        portfolioSummary: response.portfolioData ? {
          totalValue: response.portfolioData.portfolio.totalPortfolioValue,
          totalPnL: response.portfolioData.portfolio.totalProfitLoss,
          holdingsCount: response.portfolioData.portfolio.holdingsCount
        } : null,
        optimization: {
          portfolioDataSkipped: response.portfolioRequired === false,
          reasonForSkipping: response.portfolioRequired === false ? 'General market query - no portfolio data needed' : null,
          tokensSaved: response.portfolioRequired === false ? 'High' : 'None'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in chatbot query:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to process query',
      messageHi: 'प्रश्न को प्रोसेस करने में त्रुटि',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/chatbot/tips
 * Get quick stock market tips
 */
router.get('/tips', auth, async (req, res) => {
  try {
    const { language } = req.query;
    
    const tip = await chatbotService.getQuickTips(language);
    
    res.json({
      success: true,
      data: {
        tip: tip,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error getting tips:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get tips',
      messageHi: 'टिप्स लेने में त्रुटि'
    });
  }
});

/**
 * POST /api/chatbot/refresh-portfolio
 * Force refresh portfolio cache after trading
 */
router.post('/refresh-portfolio', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`🔄 Force refreshing portfolio cache for user ${userId}`);
    
    const portfolioData = await chatbotService.refreshPortfolioCache(userId);
    
    res.json({
      success: true,
      message: 'Portfolio cache refreshed successfully',
      data: {
        portfolioValue: portfolioData?.portfolio?.totalPortfolioValue || 0,
        totalPnL: portfolioData?.portfolio?.totalProfitLoss || 0,
        holdingsCount: portfolioData?.portfolio?.holdingsCount || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error refreshing portfolio cache:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to refresh portfolio cache'
    });
  }
});

/**
 * GET /api/chatbot/portfolio-insights
 * Get portfolio performance insights
 */
router.get('/portfolio-insights', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const insights = chatbotService.getPortfolioPerformanceInsights(userId);
    
    res.json({
      success: true,
      data: {
        insights: insights,
        hasData: !!insights,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error getting portfolio insights:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get portfolio insights'
    });
  }
});

/**
 * GET /api/chatbot/status
 * Get chatbot service status
 */
router.get('/status', auth, async (req, res) => {
  try {
    const status = chatbotService.getServiceStatus();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('❌ Error getting chatbot status:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get status'
    });
  }
});

/**
 * POST /api/chatbot/feedback
 * Submit feedback on chatbot response
 */
router.post('/feedback', auth, async (req, res) => {
  try {
    const { query, response, rating, feedback } = req.body;
    const userId = req.user.id;

    // Log feedback for improvement
    console.log(`📝 Chatbot feedback from user ${userId}:`, {
      query: query.substring(0, 50),
      rating: rating,
      feedback: feedback
    });

    // In a production environment, you might want to store this in a database
    // for analytics and improvement

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      messageHi: 'फीडबैक सफलतापूर्वक जमा किया गया'
    });

  } catch (error) {
    console.error('❌ Error submitting feedback:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      messageHi: 'फीडबैक जमा करने में त्रुटि'
    });
  }
});

module.exports = router;
