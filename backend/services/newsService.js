const News = require('../models/News');

class NewsService {
  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY;
    this.apiUrl = 'https://api.perplexity.ai/chat/completions';
    this.maxCallsPerDay = 15; // Increased for real-time coverage
    this.marketHoursInterval = 60 * 60 * 1000; // 1 hour for market hours
    this.nonMarketHoursInterval = 3 * 60 * 60 * 1000; // 3 hours for weekends/holidays
    this.lastCallTime = 0;
    this.dailyCallCount = 0;
    this.lastResetDate = new Date().toDateString();
    this.monthlyCallCount = 0;
    this.lastMonthlyReset = new Date().getMonth();
    
    // Target stocks for news analysis
    this.targetStocks = ['RELIANCE', 'INFY', 'TCS', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'WIPRO', 'ITC', 'BHARTIARTL', 'KOTAKBANK'];
    
    // IST timezone offset
    this.istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    
    console.log('✅ NewsService initialized with optimized real-time news fetching');
    console.log(`📊 Rate limits: ${this.maxCallsPerDay} calls per day (market: 1hr, non-market: 3hr)`);
    console.log(`🕐 Market hours: 8 AM - 7 PM IST (11 calls/day weekdays)`);
    console.log(`📅 Weekend/Holiday: Every 3 hours (8 calls/day)`);
  }

  /**
   * Check if it's a market day (Monday to Friday)
   */
  isMarketDay() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // 0 = Sunday, 6 = Saturday
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  /**
   * Check if current time is within extended market hours (8 AM - 7 PM IST)
   */
  isExtendedMarketHours() {
    const now = new Date();
    const istTime = new Date(now.getTime() + this.istOffset);
    const hour = istTime.getUTCHours();
    
    // Extended market hours: 8 AM to 7 PM IST (11 hours)
    return hour >= 8 && hour < 19;
  }

  /**
   * Get current appropriate interval based on market conditions
   */
  getCurrentInterval() {
    const isMarketDay = this.isMarketDay();
    const isExtendedHours = this.isExtendedMarketHours();
    
    if (isMarketDay && isExtendedHours) {
      return this.marketHoursInterval; // 1 hour during market hours
    } else {
      return this.nonMarketHoursInterval; // 3 hours for weekends/holidays/off-hours
    }
  }

  /**
   * Get maximum expected calls for current day type
   */
  getExpectedDailyCalls() {
    const isMarketDay = this.isMarketDay();
    
    if (isMarketDay) {
      // Extended market hours: 8 AM - 7 PM = 11 hours = 11 calls
      // Plus potential off-hours calls = ~13 calls max
      return 11;
    } else {
      // Weekend/Holiday: 24 hours / 3 hours = 8 calls
      return 8;
    }
  }

  /**
   * Reset monthly tracking
   */
  resetMonthlyCount() {
    const currentMonth = new Date().getMonth();
    if (currentMonth !== this.lastMonthlyReset) {
      this.monthlyCallCount = 0;
      this.lastMonthlyReset = currentMonth;
      console.log(`📅 New month detected, resetting monthly API call count`);
    }
  }

  /**
   * Check if we can make an API call with dynamic rate limiting
   */
  canMakeApiCall() {
    const now = new Date();
    const currentDate = now.toDateString();
    
    // Reset daily count if it's a new day
    if (currentDate !== this.lastResetDate) {
      this.dailyCallCount = 0;
      this.lastResetDate = currentDate;
      console.log(`📅 New day detected, resetting API call count`);
    }
    
    // Reset monthly count
    this.resetMonthlyCount();
    
    const currentInterval = this.getCurrentInterval();
    const timeSinceLastCall = now.getTime() - this.lastCallTime;
    const hasWaitedEnough = timeSinceLastCall >= currentInterval;
    const expectedDailyCalls = this.getExpectedDailyCalls();
    const underDailyLimit = this.dailyCallCount < expectedDailyCalls;
    const underMaxLimit = this.dailyCallCount < this.maxCallsPerDay;
    const isMarketDay = this.isMarketDay();
    const isExtendedHours = this.isExtendedMarketHours();
    
    // Fallback to longer intervals if approaching limits
    let adjustedInterval = currentInterval;
    if (this.dailyCallCount >= expectedDailyCalls * 0.8) {
      adjustedInterval = currentInterval * 1.5; // Increase interval by 50%
      console.log(`⚠️ Approaching daily limit, increased interval to ${adjustedInterval / (60 * 1000)} minutes`);
    }
    
    const hasWaitedAdjusted = timeSinceLastCall >= adjustedInterval;
    
    console.log(`🔍 Real-time API Call Check:`, {
      isMarketDay,
      isExtendedHours,
      currentInterval: `${currentInterval / (60 * 1000)} min`,
      adjustedInterval: `${adjustedInterval / (60 * 1000)} min`,
      underDailyLimit: `${this.dailyCallCount}/${expectedDailyCalls}`,
      underMaxLimit: `${this.dailyCallCount}/${this.maxCallsPerDay}`,
      hasWaitedEnough: hasWaitedAdjusted,
      timeSinceLastCall: Math.floor(timeSinceLastCall / (1000 * 60)) + ' minutes',
      monthlyCount: this.monthlyCallCount
    });
    
    // Allow calls during both market days and weekends/holidays
    const canCall = underMaxLimit && hasWaitedAdjusted;
    
    if (canCall) {
      console.log(`✅ API call approved - ${isMarketDay && isExtendedHours ? 'Market Hours' : 'Non-Market Hours'} mode`);
    }
    
    return canCall;
  }

  /**
   * Call Perplexity Sonar API for latest Indian stock market news
   */
  async fetchNewsFromPerplexity() {
    try {
      if (!this.canMakeApiCall()) {
        const currentInterval = this.getCurrentInterval();
        const reason = this.dailyCallCount >= this.maxCallsPerDay ? 'daily limit reached' : 
                      'minimum interval not met';
        throw new Error(`Cannot make API call: ${reason}. Next call in ${currentInterval / (60 * 1000)} minutes`);
      }

      const isMarketDay = this.isMarketDay();
      const isExtendedHours = this.isExtendedMarketHours();
      const isWeekend = !isMarketDay;
      
      console.log(`🔄 Calling Perplexity Sonar API - ${isMarketDay && isExtendedHours ? 'Market Hours' : isWeekend ? 'Weekend' : 'Off-Hours'} mode...`);
      
      // Different prompts for different time periods
      let newsPrompt;
      let newsCount;
      
      if (isWeekend) {
        // Weekend prompt - fewer items, broader scope
        newsCount = 3;
        newsPrompt = `Give me exactly 3 major Indian/global financial news items affecting stock markets this weekend. Focus on:
1. Major corporate announcements or results
2. Government policy changes affecting markets  
3. Global events impacting Indian markets

For each news:
1. Write clear headline in Hindi-English mix (max 15 words)
2. Explain impact on Indian stock markets in simple Hindi-English
3. Mention if it affects Reliance/Infosys/TCS/HDFC Bank/ICICI Bank/SBI/Wipro/ITC/Bharti Airtel/Kotak Bank

Format as:
NEWS 1: [Headline]
[Explanation]
Stock Impact: [If any]`;
      } else {
        // Off-market hours - summary focus
        newsCount = 4;
        newsPrompt = `Give me exactly 4 important Indian stock market news items for today (off-market hours). Focus on:
1. After-market developments
2. Tomorrow's market outlook
3. Major corporate updates
4. Economic indicators or policy news

For each news:
1. Write clear headline in Hindi-English mix (max 15 words)
2. Explain relevance for tomorrow's market in simple Hindi-English
3. Mention impact on Reliance/Infosys/TCS/HDFC Bank/ICICI Bank/SBI/Wipro/ITC/Bharti Airtel/Kotak Bank if relevant

Format as:
NEWS 1: [Headline]
[Market Outlook Explanation]
Stock Impact: [If any]`;
      }
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [{
            role: 'user',
            content: newsPrompt + `

Continue for all ${newsCount} news. No markdown symbols (*), no reference numbers [1][2], no extra formatting. Keep each news under 60 words. Use current market data and latest developments.`
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Update call tracking with enhanced logging
      this.lastCallTime = new Date().getTime();
      this.dailyCallCount++;
      this.monthlyCallCount++;
      
      const expectedDaily = this.getExpectedDailyCalls();
      const nextInterval = this.getCurrentInterval();
      
      console.log(`✅ Perplexity API call successful!`);
      console.log(`📊 Usage: Daily ${this.dailyCallCount}/${expectedDaily} (max: ${this.maxCallsPerDay}), Monthly: ${this.monthlyCallCount}`);
      console.log(`⏰ Next call interval: ${nextInterval / (60 * 1000)} minutes`);
      console.log(`📰 Fetched ${newsCount} ${isWeekend ? 'weekend' : isExtendedHours ? 'market-hours' : 'off-hours'} news items`);
      
      return data.choices[0]?.message?.content || 'No news content received';
      
    } catch (error) {
      console.error('❌ Error calling Perplexity API:', error.message);
      throw error;
    }
  }

  /**
   * Parse news content and extract individual news items with stock impacts
   */
  parseNewsContent(content) {
    try {
      console.log('🔍 Parsing news content for individual news items...');
      
      // Clean the content carefully to preserve Unicode characters
      let cleanContent = content
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown but keep content
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic markdown but keep content  
        .replace(/\[[0-9]+\]/g, '') // Remove reference numbers like [1], [2]
        .replace(/#{1,6}\s+/g, '') // Remove markdown headers
        .replace(/`([^`]+)`/g, '$1') // Remove code markdown but keep content
        .replace(/^\s+|\s+$/gm, '') // Trim lines
        .replace(/\n\s*\n/g, '\n') // Remove empty lines
        .trim();
      
      console.log('🧹 Cleaned content:', cleanContent);
      
      // Split content into individual news items
      const newsItems = [];
      const newsPattern = /NEWS\s+(\d+):\s*(.*?)(?=NEWS\s+\d+:|$)/gs;
      let match;
      
      while ((match = newsPattern.exec(cleanContent)) !== null) {
        const newsNumber = match[1];
        const newsContent = match[2].trim();
        
        // Extract headline and content
        const lines = newsContent.split('\n').filter(line => line.trim());
        const headline = lines[0] || `समाचार ${newsNumber} - News ${newsNumber}`;
        const explanation = lines.slice(1).join(' ').replace(/Stock Impact:.*$/i, '').trim();
        const stockImpactMatch = newsContent.match(/Stock Impact:\s*(.*)/i);
        const stockImpactText = stockImpactMatch ? stockImpactMatch[1].trim() : '';
        
        // Analyze affected stocks for this news item
        const affectedStocks = this.analyzeStockImpact(newsContent);
        
        newsItems.push({
          headline: headline.substring(0, 100), // Limit headline length
          content: explanation.substring(0, 200), // Limit content length
          stockImpactText,
          affectedStocks,
          category: 'stock-market'
        });
        
        console.log(`📰 Parsed News ${newsNumber}: ${headline.substring(0, 30)}...`);
      }
      
      // If no structured news found, treat as single news item
      if (newsItems.length === 0) {
        console.log('📰 No structured news found, treating as single item');
        const affectedStocks = this.analyzeStockImpact(cleanContent);
        
        newsItems.push({
          headline: 'बाजार समाचार - Market News',
          content: cleanContent.substring(0, 300),
          stockImpactText: '',
          affectedStocks,
          category: 'stock-market'
        });
      }
      
      return newsItems;
      
    } catch (error) {
      console.error('❌ Error parsing news content:', error.message);
      return [{
        headline: 'समाचार पार्सिंग त्रुटि - News Parsing Error',
        content: content.substring(0, 200),
        stockImpactText: '',
        affectedStocks: [],
        category: 'general'
      }];
    }
  }

  /**
   * Analyze stock impact from news content
   */
  analyzeStockImpact(content) {
    try {
      const affectedStocks = [];
      const contentLower = content.toLowerCase();
      
      // Analyze each target stock
      this.targetStocks.forEach(symbol => {
        const stockName = this.getStockName(symbol).toLowerCase();
        
        if (contentLower.includes(stockName) || contentLower.includes(symbol.toLowerCase())) {
          let impact = 'neutral';
          let explanation = 'मुख्य समाचार में शामिल - Main news mention';
          
          // Simple sentiment analysis for stock impact
          const stockContext = this.extractStockContext(contentLower, stockName);
          
          if (this.hasPositiveKeywords(stockContext)) {
            impact = 'positive';
            explanation = 'सकारात्मक प्रभाव संभावित - Positive impact likely';
          } else if (this.hasNegativeKeywords(stockContext)) {
            impact = 'negative';
            explanation = 'नकारात्मक प्रभाव संभावित - Negative impact likely';
          }
          
          affectedStocks.push({
            symbol,
            impact,
            explanation,
            confidence: 0.7
          });
          
          console.log(`� Stock impact: ${symbol} - ${impact}`);
        }
      });
      
      return affectedStocks;
      
    } catch (error) {
      console.error('❌ Error analyzing stock impact:', error.message);
      return [];
    }
  }

  /**
   * Get readable stock name
   */
  getStockName(symbol) {
    const stockNames = {
      'RELIANCE': 'reliance',
      'INFY': 'infosys',
      'TCS': 'tcs',
      'HDFCBANK': 'hdfc bank',
      'ICICIBANK': 'icici bank',
      'SBIN': 'sbi',
      'WIPRO': 'wipro',
      'ITC': 'itc',
      'BHARTIARTL': 'bharti airtel',
      'KOTAKBANK': 'kotak mahindra bank'
    };
    return stockNames[symbol] || symbol;
  }

  /**
   * Extract context around stock mention
   */
  extractStockContext(text, stockName) {
    const index = text.indexOf(stockName);
    if (index === -1) return '';
    
    const start = Math.max(0, index - 100);
    const end = Math.min(text.length, index + stockName.length + 100);
    
    return text.substring(start, end);
  }

  /**
   * Check for positive keywords in context
   */
  hasPositiveKeywords(context) {
    const positiveWords = [
      'up', 'rise', 'gain', 'profit', 'growth', 'increase', 'positive', 'good', 'better',
      'strong', 'boost', 'surge', 'rally', 'upgrade', 'buy', 'bullish',
      'बढ़ा', 'फायदा', 'मुनाफा', 'अच्छा', 'बेहतर', 'मजबूत'
    ];
    
    return positiveWords.some(word => context.includes(word));
  }

  /**
   * Check for negative keywords in context
   */
  hasNegativeKeywords(context) {
    const negativeWords = [
      'down', 'fall', 'drop', 'loss', 'decline', 'decrease', 'negative', 'bad', 'worse',
      'weak', 'crash', 'plunge', 'downgrade', 'sell', 'bearish',
      'गिरा', 'नुकसान', 'कम', 'बुरा', 'कमजोर'
    ];
    
    return negativeWords.some(word => context.includes(word));
  }

  /**
   * Process and store news
   */
  async processAndStoreNews() {
    try {
      console.log('🔄 Starting news processing cycle...');
      
      if (!this.canMakeApiCall()) {
        const message = 'Skipping news fetch due to rate limits or non-market day';
        console.log(`⏭️ ${message}`);
        return { 
          success: false, 
          message,
          callsToday: this.dailyCallCount,
          maxCalls: this.maxCallsPerDay
        };
      }

      // Fetch news from Perplexity
      const newsContent = await this.fetchNewsFromPerplexity();
      
      if (!newsContent || newsContent.length < 50) {
        throw new Error('Received insufficient news content from API');
      }

      // Parse content and extract multiple news items
      const newsItems = this.parseNewsContent(newsContent);
      
      if (!newsItems || newsItems.length === 0) {
        throw new Error('Failed to parse news content into items');
      }
      
      console.log(`📰 Parsed ${newsItems.length} news items`);
      
      // Store each news item separately
      const savedNews = [];
      for (const newsItem of newsItems) {
        try {
          const newsDoc = new News({
            content: `${newsItem.headline}\n\n${newsItem.content}${newsItem.stockImpactText ? '\n\nStock Impact: ' + newsItem.stockImpactText : ''}`,
            publishedAt: new Date(),
            category: newsItem.category,
            affectedStocks: newsItem.affectedStocks,
            source: 'Perplexity Sonar API',
            language: 'hindi-english-mix'
          });
          
          const saved = await newsDoc.save();
          savedNews.push(saved);
          
          console.log(`💾 Saved news item: ${newsItem.headline.substring(0, 30)}...`);
        } catch (saveError) {
          console.error(`❌ Error saving news item: ${saveError.message}`);
        }
      }
      
      console.log(`✅ Successfully processed and saved ${savedNews.length} news items`);
      console.log(`📊 Total affected stocks: ${savedNews.reduce((acc, news) => acc + news.affectedStocks.length, 0)}`);
      
      // Clean old news
      await this.cleanOldNews();
      
      return {
        success: true,
        message: `${savedNews.length} news items processed successfully`,
        newsCount: savedNews.length,
        affectedStocks: savedNews.reduce((acc, news) => acc + news.affectedStocks.length, 0),
        callsToday: this.dailyCallCount,
        maxCalls: this.maxCallsPerDay
      };
      
    } catch (error) {
      console.error('❌ Error in news processing:', error.message);
      
      // Create fallback news entry for debugging
      if (error.message.includes('rate limits') || error.message.includes('non-market day')) {
        return {
          success: false,
          message: error.message,
          callsToday: this.dailyCallCount,
          maxCalls: this.maxCallsPerDay
        };
      }
      
      // For other errors, create a fallback news entry
      const fallbackNews = new News({
        content: `समाचार सेवा अस्थायी रूप से अनुपलब्ध - News service temporarily unavailable. कृपया बाद में पुनः प्रयास करें - Please try again later. Error: ${error.message}`,
        publishedAt: new Date(),
        category: 'general',
        affectedStocks: [],
        source: 'System Fallback'
      });
      
      await fallbackNews.save();
      
      return {
        success: false,
        message: error.message,
        fallbackCreated: true,
        callsToday: this.dailyCallCount,
        maxCalls: this.maxCallsPerDay
      };
    }
  }

  /**
   * Get latest news
   */
  async getLatestNews(limit = 10) {
    try {
      console.log(`📰 Fetching ${limit} latest news articles`);
      return await News.getLatestNews(limit);
    } catch (error) {
      console.error('❌ Error fetching latest news:', error.message);
      throw error;
    }
  }

  /**
   * Get news for specific stock
   */
  async getNewsForStock(symbol, limit = 5) {
    try {
      console.log(`📈 Fetching news for stock: ${symbol}`);
      return await News.getNewsForStock(symbol, limit);
    } catch (error) {
      console.error('❌ Error fetching stock news:', error.message);
      throw error;
    }
  }

  /**
   * Clean old news
   */
  async cleanOldNews() {
    try {
      const result = await News.cleanOldNews();
      if (result.modifiedCount > 0) {
        console.log(`🧹 Cleaned ${result.modifiedCount} old news articles`);
      }
      return result;
    } catch (error) {
      console.error('❌ Error cleaning old news:', error.message);
      throw error;
    }
  }

  /**
   * Get enhanced service statistics for real-time tracking
   */
  async getServiceStats() {
    try {
      const totalNews = await News.countDocuments({ isActive: true });
      const todayNews = await News.countDocuments({
        isActive: true,
        fetchedAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      });
      
      const currentInterval = this.getCurrentInterval();
      const expectedDailyCalls = this.getExpectedDailyCalls();
      const isMarketDay = this.isMarketDay();
      const isExtendedHours = this.isExtendedMarketHours();
      const nextCallTime = new Date(this.lastCallTime + currentInterval);
      
      // Calculate estimated monthly usage
      const weekdays = 22; // Average weekdays per month
      const weekends = 8; // Average weekend days per month
      const estimatedMonthlyCalls = (weekdays * 11) + (weekends * 8); // 242 + 64 = 306 calls
      
      return {
        // Basic stats
        totalNews,
        todayNews,
        callsToday: this.dailyCallCount,
        maxCallsPerDay: this.maxCallsPerDay,
        monthlyCallCount: this.monthlyCallCount,
        estimatedMonthlyCalls,
        
        // Real-time configuration
        isMarketDay,
        isExtendedHours,
        canMakeCall: this.canMakeApiCall(),
        currentMode: isMarketDay && isExtendedHours ? 'Market Hours' : 
                    isMarketDay ? 'Market Day Off-Hours' : 'Weekend/Holiday',
        
        // Interval tracking
        currentInterval: `${currentInterval / (60 * 1000)} minutes`,
        marketHoursInterval: `${this.marketHoursInterval / (60 * 1000)} minutes`,
        nonMarketHoursInterval: `${this.nonMarketHoursInterval / (60 * 1000)} minutes`,
        
        // Usage tracking
        expectedDailyCalls,
        dailyUsagePercentage: Math.round((this.dailyCallCount / expectedDailyCalls) * 100),
        monthlyUsagePercentage: Math.round((this.monthlyCallCount / estimatedMonthlyCalls) * 100),
        
        // Timing
        lastCallTime: this.lastCallTime > 0 ? new Date(this.lastCallTime).toISOString() : 'Never',
        nextCallAvailable: nextCallTime.toISOString(),
        minutesUntilNextCall: Math.max(0, Math.ceil((nextCallTime - new Date()) / (60 * 1000))),
        
        // Service health
        serviceStatus: this.dailyCallCount < this.maxCallsPerDay ? 'Healthy' : 'Daily Limit Reached',
        apiKeyConfigured: !!this.apiKey,
        
        // Configuration summary
        configuration: {
          realTimeMode: true,
          targetMonthlyUsage: '280-300 calls',
          marketHoursCoverage: '8 AM - 7 PM IST (11 calls/day)',
          weekendCoverage: 'Every 3 hours (8 calls/day)',
          autoAdjustInterval: true
        }
      };
    } catch (error) {
      console.error('❌ Error getting service stats:', error.message);
      throw error;
    }
  }
}

module.exports = new NewsService();
