const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../models/User');
const StockPrice = require('../models/StockPrice');
const News = require('../models/News');

class ChatbotService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ googleSearch: {} }]
    });
    
    // Smart caching system for portfolio data
    this.portfolioCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
    this.lastStockPriceUpdate = new Map();
    
    // Conversation memory for each user
    this.userConversationMemory = new Map();
    
    // Stock market related keywords for query filtering
    this.stockMarketKeywords = [
      'stock', 'share', 'portfolio', 'investment', 'trading', 'market', 'nse', 'bse',
      'reliance', 'infosys', 'tcs', 'hdfc', 'dividend', 'profit', 'loss', 'buy', 'sell',
      'शेयर', 'निवेश', 'बाजार', 'पोर्टफोलियो', 'मुनाफा', 'नुकसान', 'खरीदना', 'बेचना',
      'स्टॉक', 'ट्रेडिंग', 'कंपनी', 'रिलायंस', 'इंफोसिस', 'टीसीएस', 'एचडीएफसी',
      'holdings', 'position', 'transaction', 'trade', 'watchlist'
    ];

    // Portfolio-specific keywords that require user data
    this.portfolioSpecificKeywords = [
      'my portfolio', 'my holdings', 'my stocks', 'my investment', 'my position', 'my profit', 'my loss',
      'my trades', 'my balance', 'my performance', 'should i buy', 'should i sell', 'my watchlist',
      'मेरा पोर्टफोलियो', 'मेरे शेयर', 'मेरा निवेश', 'मेरा लाभ', 'मेरा नुकसान', 'मैं खरीदूं', 'मैं बेचूं',
      'what do i own', 'how much profit', 'how much loss', 'my current', 'i have', 'i own',
      'portfolio', 'holdings', 'pnl', 'p&l'
    ];

    console.log('✅ ChatbotService initialized with smart portfolio memory and caching');
    
    // Start cleanup interval for memory management
    this.startCleanupInterval();
  }

  /**
   * Smart cache management - only fetch if data is stale or missing
   */
  isCacheValid(userId) {
    const cachedData = this.portfolioCache.get(userId);
    if (!cachedData) return false;
    
    const now = Date.now();
    return (now - cachedData.timestamp) < this.cacheExpiry;
  }

  /**
   * Update user conversation memory for context awareness
   */
  updateConversationMemory(userId, userQuery, portfolioData) {
    const memory = this.userConversationMemory.get(userId) || {
      queries: [],
      portfolioSnapshots: [],
      tradingPatterns: [],
      interests: []
    };

    // Store recent queries (last 10)
    memory.queries.unshift({
      query: userQuery,
      timestamp: new Date(),
      portfolioValue: portfolioData?.portfolio?.totalPortfolioValue || 0
    });
    memory.queries = memory.queries.slice(0, 10);

    // Track portfolio snapshots for comparison
    if (portfolioData?.portfolio) {
      memory.portfolioSnapshots.unshift({
        value: portfolioData.portfolio.totalPortfolioValue,
        pnl: portfolioData.portfolio.totalProfitLoss,
        holdingsCount: portfolioData.portfolio.portfolio.length,
        timestamp: new Date()
      });
      memory.portfolioSnapshots = memory.portfolioSnapshots.slice(0, 5);
    }

    // Analyze trading patterns
    const queryLower = userQuery.toLowerCase();
    if (queryLower.includes('buy') || queryLower.includes('खरीद')) {
      memory.tradingPatterns.push({ action: 'buy_interest', timestamp: new Date() });
    }
    if (queryLower.includes('sell') || queryLower.includes('बेच')) {
      memory.tradingPatterns.push({ action: 'sell_interest', timestamp: new Date() });
    }

    this.userConversationMemory.set(userId, memory);
  }

  /**
   * Check if query requires portfolio data
   */
  requiresPortfolioData(query) {
    const queryLower = query.toLowerCase();
    return this.portfolioSpecificKeywords.some(keyword => 
      queryLower.includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if query is related to stock market
   */
  isStockMarketQuery(query) {
    const queryLower = query.toLowerCase();
    return this.stockMarketKeywords.some(keyword => 
      queryLower.includes(keyword.toLowerCase())
    );
  }

  /**
   * Get comprehensive user portfolio data from MongoDB with smart caching
   */
  async getUserPortfolioData(userId) {
    try {
      console.log(`📊 Checking portfolio cache for user: ${userId}`);
      
      // Check if we have valid cached data
      if (this.isCacheValid(userId)) {
        console.log('✅ Using cached portfolio data');
        return this.portfolioCache.get(userId).data;
      }

      console.log('🔄 Fetching fresh portfolio data from MongoDB');
      
      // Get complete user data with all portfolio information
      const user = await User.findById(userId).select(
        'name email virtualBalance totalInvested totalPortfolioValue totalProfitLoss totalProfitLossPercent ' +
        'portfolio transactions watchlist achievements lastLogin'
      );
      
      if (!user) {
        throw new Error('User not found');
      }

      // Get current stock prices for user's holdings
      const userSymbols = [...new Set([
        ...user.portfolio.map(p => p.symbol),
        ...user.watchlist.map(w => w.symbol)
      ])];

      const stockPrices = {};
      if (userSymbols.length > 0) {
        try {
          const prices = await StockPrice.find({ 
            symbol: { $in: userSymbols } 
          }).sort({ timestamp: -1 }).limit(userSymbols.length);
          
          prices.forEach(price => {
            stockPrices[price.symbol] = price;
          });
        } catch (priceError) {
          console.log('📊 Using last known prices from portfolio');
        }
      }

      // Calculate real-time portfolio metrics
      let portfolioValue = 0;
      let totalInvested = user.totalInvested || 0;
      const holdings = user.portfolio.map(holding => {
        const currentPrice = stockPrices[holding.symbol]?.currentPrice || holding.currentPrice;
        const currentValue = holding.quantity * currentPrice;
        const investment = holding.quantity * holding.averagePrice;
        const pnl = currentValue - investment;
        const pnlPercent = investment > 0 ? ((pnl / investment) * 100) : 0;

        portfolioValue += currentValue;

        return {
          symbol: holding.symbol,
          companyName: holding.companyName,
          quantity: holding.quantity,
          averagePrice: holding.averagePrice,
          currentPrice: currentPrice,
          investment: investment,
          currentValue: currentValue,
          pnl: pnl,
          pnlPercent: pnlPercent,
          instrumentKey: holding.instrumentKey
        };
      });

      const totalPnL = portfolioValue - totalInvested;
      const totalPnLPercent = totalInvested > 0 ? ((totalPnL / totalInvested) * 100) : 0;

      // Get recent transactions (last 10)
      const recentTransactions = user.transactions
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10)
        .map(tx => ({
          type: tx.type,
          symbol: tx.symbol,
          companyName: tx.companyName,
          quantity: tx.quantity,
          price: tx.price,
          totalAmount: tx.totalAmount,
          profitLoss: tx.profitLoss,
          timestamp: tx.timestamp
        }));

      // Get watchlist with current prices
      const watchlist = user.watchlist.map(item => ({
        symbol: item.symbol,
        companyName: item.companyName,
        currentPrice: stockPrices[item.symbol]?.currentPrice || 0,
        alertPrice: item.alertPrice,
        alertEnabled: item.alertEnabled,
        addedAt: item.addedAt
      }));

      // Calculate trading statistics
      const buyTransactions = user.transactions.filter(tx => tx.type === 'BUY');
      const sellTransactions = user.transactions.filter(tx => tx.type === 'SELL');
      const totalTrades = user.transactions.length;
      const winningTrades = sellTransactions.filter(tx => tx.profitLoss > 0).length;
      const winRate = sellTransactions.length > 0 ? ((winningTrades / sellTransactions.length) * 100) : 0;

      // Get user achievements for experience level
      const achievementCount = user.achievements ? user.achievements.length : 0;

      const portfolioData = {
        user: {
          name: user.name,
          email: user.email,
          virtualBalance: user.virtualBalance,
          lastLogin: user.lastLogin,
          experienceLevel: achievementCount > 10 ? 'Advanced' : achievementCount > 5 ? 'Intermediate' : 'Beginner'
        },
        portfolio: {
          totalInvested: totalInvested,
          totalPortfolioValue: portfolioValue,
          totalProfitLoss: totalPnL,
          totalProfitLossPercent: totalPnLPercent,
          portfolio: holdings,
          holdingsCount: holdings.length,
          diversificationScore: Math.min(holdings.length * 10, 100) // Simple score
        },
        trading: {
          totalTrades: totalTrades,
          buyTransactions: buyTransactions.length,
          sellTransactions: sellTransactions.length,
          winRate: winRate,
          avgTradeSize: totalTrades > 0 ? (totalInvested / totalTrades) : 0,
          recentTransactions: recentTransactions
        },
        watchlist: {
          items: watchlist,
          count: watchlist.length
        },
        marketData: {
          stockPrices: stockPrices,
          lastUpdated: new Date()
        },
        achievements: {
          count: achievementCount,
          list: user.achievements || []
        }
      };

      // Cache the data with timestamp
      this.portfolioCache.set(userId, {
        data: portfolioData,
        timestamp: Date.now()
      });

      console.log(`✅ Portfolio data cached for user ${userId} - ${holdings.length} holdings, ${totalTrades} total trades`);
      return portfolioData;

    } catch (error) {
      console.error('❌ Error fetching portfolio data:', error.message);
      return null;
    }
  }

  /**
   * Create context prompt - portfolio data only included when needed
   */
  createContextPrompt(userQuery, portfolioData, userLanguage) {
    // Map of supported languages with their language instructions
    const languageInstructions = {
      'english': 'Respond in English only.',
      'hindi': 'IMPORTANT: You MUST respond COMPLETELY in Hindi (हिंदी) language only. Do not use any English words. Use proper Hindi vocabulary for ALL financial terms and concepts. Example: Use "शेयर बाज़ार" not "stock market", "निवेश" not "investment", "कंपनी" not "company".',
      'telugu': 'IMPORTANT: You MUST respond COMPLETELY in Telugu (తెలుగు) language only. Do not use any English words. Use proper Telugu vocabulary for ALL financial terms and concepts. Example: Use "షేర్ మార్కెట్" not "stock market", "పెట్టుబడి" not "investment".',
      'tamil': 'IMPORTANT: You MUST respond COMPLETELY in Tamil (தமிழ்) language only. Do not use any English words. Use proper Tamil vocabulary for ALL financial terms and concepts. Example: Use "பங்குச் சந்தை" not "stock market", "முதலீடு" not "investment".',
      'bengali': 'IMPORTANT: You MUST respond COMPLETELY in Bengali (বাংলা) language only. Do not use any English words. Use proper Bengali vocabulary for ALL financial terms and concepts. Example: Use "শেয়ার বাজার" not "stock market", "বিনিয়োগ" not "investment".',
      'marathi': 'IMPORTANT: You MUST respond COMPLETELY in Marathi (मराठी) language only. Do not use any English words. Use proper Marathi vocabulary for ALL financial terms and concepts. Example: Use "शेअर बाजार" not "stock market", "गुंतवणूक" not "investment", "कंपनी" not "company".',
      'gujarati': 'IMPORTANT: You MUST respond COMPLETELY in Gujarati (ગુજરાતી) language only. Do not use any English words. Use proper Gujarati vocabulary for ALL financial terms and concepts. Example: Use "શેર બજાર" not "stock market", "રોકાણ" not "investment".',
      'kannada': 'IMPORTANT: You MUST respond COMPLETELY in Kannada (ಕನ್ನಡ) language only. Do not use any English words. Use proper Kannada vocabulary for ALL financial terms and concepts. Example: Use "ಷೇರು ಮಾರುಕಟ್ಟೆ" not "stock market", "ಹೂಡಿಕೆ" not "investment".',
      'malayalam': 'IMPORTANT: You MUST respond COMPLETELY in Malayalam (മലയാളം) language only. Do not use any English words. Use proper Malayalam vocabulary for ALL financial terms and concepts. Example: Use "ഓഹരി വിപണി" not "stock market", "നിക്ഷേപം" not "investment".',
      'punjabi': 'IMPORTANT: You MUST respond COMPLETELY in Punjabi (ਪੰਜਾਬੀ) language only. Do not use any English words. Use proper Punjabi vocabulary for ALL financial terms and concepts. Example: Use "ਸਟਾਕ ਮਾਰਕੀਟ" not "stock market", "ਨਿਵੇਸ਼" not "investment".'
    };
    
    const languageInstruction = languageInstructions[userLanguage] || languageInstructions['english'];
    
    console.log(`🌍 Language instruction for ${userLanguage}:`, languageInstruction);
    
    let context = `LANGUAGE REQUIREMENT: ${languageInstruction}

You are StockEst AI, an intelligent stock market assistant for Indian investors.

CRITICAL: ${languageInstruction}`;
    
    if (portfolioData) {
      // Only add portfolio context if portfolio data was actually needed and provided
      const user = portfolioData.user;
      const portfolio = portfolioData.portfolio;
      const trading = portfolioData.trading;
      const watchlist = portfolioData.watchlist;

      context += ` You have complete access to this user's portfolio and investment data.`;

      context += `\n\n=== USER PROFILE ===
Name: ${user.name}
Experience Level: ${user.experienceLevel}
Available Balance: ₹${user.virtualBalance.toLocaleString()}
Last Active: ${new Date(user.lastLogin).toLocaleDateString()}

=== CURRENT PORTFOLIO ===
Total Invested: ₹${portfolio.totalInvested.toLocaleString()}
Portfolio Value: ₹${portfolio.totalPortfolioValue.toLocaleString()}
Total P&L: ₹${portfolio.totalProfitLoss.toFixed(2)} (${portfolio.totalProfitLossPercent.toFixed(2)}%)
Holdings: ${portfolio.holdingsCount} stocks
Diversification Score: ${portfolio.diversificationScore}/100

=== DETAILED HOLDINGS ===`;

      portfolio.portfolio.forEach((holding, index) => {
        const status = holding.pnl >= 0 ? '📈 PROFIT' : '📉 LOSS';
        const arrow = holding.pnl >= 0 ? '↗️' : '↘️';
        context += `\n${index + 1}. ${holding.companyName} (${holding.symbol}):
   • Shares: ${holding.quantity} @ ₹${holding.averagePrice} avg
   • Current: ₹${holding.currentPrice} ${arrow}
   • Investment: ₹${holding.investment.toLocaleString()}
   • Value: ₹${holding.currentValue.toLocaleString()}
   • P&L: ₹${holding.pnl.toFixed(2)} (${holding.pnlPercent.toFixed(2)}%) ${status}`;
      });

      context += `\n\n=== TRADING STATISTICS ===
Total Trades: ${trading.totalTrades}
Buy Orders: ${trading.buyTransactions} | Sell Orders: ${trading.sellTransactions}
Win Rate: ${trading.winRate.toFixed(1)}%
Average Trade Size: ₹${trading.avgTradeSize.toFixed(0)}`;

      if (trading.recentTransactions.length > 0) {
        context += `\n\n=== RECENT TRANSACTIONS ===`;
        trading.recentTransactions.slice(0, 5).forEach((tx, index) => {
          const date = new Date(tx.timestamp).toLocaleDateString();
          const pnlText = tx.type === 'SELL' ? ` (P&L: ₹${tx.profitLoss?.toFixed(2) || 0})` : '';
          context += `\n${index + 1}. ${tx.type} ${tx.quantity} ${tx.symbol} @ ₹${tx.price} on ${date}${pnlText}`;
        });
      }

      if (watchlist.count > 0) {
        context += `\n\n=== WATCHLIST (${watchlist.count} stocks) ===`;
        watchlist.items.slice(0, 5).forEach((item, index) => {
          const alertText = item.alertEnabled ? ` [Alert @ ₹${item.alertPrice}]` : '';
          context += `\n${index + 1}. ${item.companyName} (${item.symbol}) - ₹${item.currentPrice}${alertText}`;
        });
      }

      // Add conversation memory context
      const userId = portfolioData.user.email;
      const memory = this.userConversationMemory.get(userId);
      if (memory && memory.queries.length > 0) {
        context += `\n\n=== CONVERSATION MEMORY ===`;
        context += `\nRecent topics discussed: ${memory.queries.slice(0, 3).map(q => q.query.substring(0, 50)).join(', ')}`;
        
        if (memory.portfolioSnapshots.length > 1) {
          const latest = memory.portfolioSnapshots[0];
          const previous = memory.portfolioSnapshots[1];
          const change = latest.value - previous.value;
          context += `\nPortfolio trend: ${change >= 0 ? '📈 Growing' : '📉 Declining'} by ₹${Math.abs(change).toFixed(2)}`;
        }
      }

      // Add intelligent insights
      context += `\n\n=== AI INSIGHTS ===`;
      
      // Performance insights
      if (portfolio.totalProfitLossPercent > 10) {
        context += `\n• 🎉 Excellent performance! Portfolio up ${portfolio.totalProfitLossPercent.toFixed(1)}%`;
      } else if (portfolio.totalProfitLossPercent > 0) {
        context += `\n• ✅ Positive returns of ${portfolio.totalProfitLossPercent.toFixed(1)}%`;
      } else if (portfolio.totalProfitLossPercent < -10) {
        context += `\n• ⚠️ Significant loss of ${Math.abs(portfolio.totalProfitLossPercent).toFixed(1)}% - may need review`;
      } else {
        context += `\n• 📊 Portfolio slightly down ${Math.abs(portfolio.totalProfitLossPercent).toFixed(1)}%`;
      }

      // Diversification insights
      if (portfolio.holdingsCount < 3) {
        context += `\n• 🎯 Consider diversifying - only ${portfolio.holdingsCount} stocks in portfolio`;
      } else if (portfolio.holdingsCount > 10) {
        context += `\n• 📈 Well diversified with ${portfolio.holdingsCount} stocks`;
      }

      // Trading pattern insights
      if (trading.winRate > 70) {
        context += `\n• 🏆 Excellent trading skills with ${trading.winRate.toFixed(1)}% win rate`;
      } else if (trading.winRate < 40 && trading.sellTransactions > 0) {
        context += `\n• 📚 Consider improving strategy - win rate is ${trading.winRate.toFixed(1)}%`;
      }

      context += `\n\n=== PORTFOLIO-SPECIFIC INSTRUCTIONS ===
You have complete access to the user's portfolio data above. Use this information to:
• Address them by name (${portfolioData?.user?.name || 'Investor'})
• Reference their actual holdings when giving advice
• Use their trading history to provide context
• Mention specific P&L numbers when relevant
• Suggest actions based on their risk profile and past behavior`;
    } else {
      // For general market queries without portfolio context
      context += ` You provide general stock market information and analysis for Indian markets.`;
    }

    context += `\n\n=== CRITICAL LANGUAGE REQUIREMENTS ===
${languageInstruction}

=== GENERAL INSTRUCTIONS ===
1. Answer only stock market, investment, trading, and financial literacy questions
2. Use simple language suitable for Indian investors
3. Provide educational explanations with real-world examples
4. Use current market data from Google Search when needed
5. Be encouraging and supportive for investors
6. MANDATORY: ${languageInstruction}
7. Keep responses concise but informative
8. For general market questions, focus on broad market analysis and education

REMINDER: Your response MUST be in the language specified above. Do not mix languages.

Current Query: "${userQuery}"

${portfolioData ? 'Remember: Use the specific portfolio data provided to give personalized advice.' : 'Note: This is a general market query - provide broad market insights and educational content.'}

FINAL REMINDER: ${languageInstruction}`;

    return context;
  }

  /**
   * Process and clean the AI response
   */
  processResponse(response) {
    try {
      let text = response.response.text();
      
      // Remove markdown asterisks and formatting
      text = text.replace(/\*\*/g, '').replace(/\*/g, '');
      
      // Remove inline reference numbers like [1], [2], etc.
      text = text.replace(/\[[0-9]+\]/g, '');
      
      // Remove other markdown symbols
      text = text.replace(/`/g, '').replace(/#{1,6}\s*/g, '');
      
      // Extract sources from grounding metadata
      const sources = [];
      if (response.response.candidates && response.response.candidates[0].groundingMetadata) {
        const groundingChunks = response.response.candidates[0].groundingMetadata.groundingChunks || [];
        
        groundingChunks.forEach(chunk => {
          if (chunk.web && chunk.web.uri) {
            const title = chunk.web.title || 'Learn More';
            sources.push({
              title: title,
              url: chunk.web.uri
            });
          }
        });
      }

      // Remove duplicate sources
      const uniqueSources = sources.filter((source, index, self) => 
        index === self.findIndex(s => s.url === source.url)
      );

      return {
        text: text.trim(),
        sources: uniqueSources
      };
    } catch (error) {
      console.error('❌ Error processing response:', error.message);
      return {
        text: response.response?.text() || 'Unable to process response',
        sources: []
      };
    }
  }

  /**
   * Generate response using Gemini with conditional portfolio data fetching
   */
  async generateResponse(userQuery, userId, userLanguage = 'english') {
    try {
      console.log(`🤖 Processing query: "${userQuery}" for user: ${userId} in language: ${userLanguage}`);
      
      // Check if query is stock market related
      if (!this.isStockMarketQuery(userQuery)) {
        const errorMessages = {
          'english': 'I can only answer questions related to stock market, investments, and trading. Please ask a question related to the stock market.',
          'hindi': 'मैं केवल शेयर बाज़ार, निवेश, और ट्रेडिंग के सवालों का जवाब दे सकता हूँ। कृपया स्टॉक मार्केट से जुड़ा प्रश्न पूछें।',
          'telugu': 'నేను స్టాక్ మార్కెట్, పెట్టుబడులు మరియు ట్రేడింగ్‌కు సంబంధించిన ప్రశ్నలకు మాత్రమే సమాధానం ఇవ్వగలను।',
          'tamil': 'நான் பங்குச் சந்தை, முதலீடுகள் மற்றும் வர்த்தகம் தொடர்பான கேள்விகளுக்கு மட்டுமே பதிலளிக்க முடியும்।',
          'bengali': 'আমি শুধুমাত্র শেয়ার বাজার, বিনিয়োগ এবং ট্রেডিং সংক্রান্ত প্রশ্নের উত্তর দিতে পারি।',
          'marathi': 'मी फक्त शेअर बाजार, गुंतवणूक आणि ट्रेडिंगशी संबंधित प्रश्नांची उत्तरे देऊ शकतो।',
          'gujarati': 'હું ફક્ત શેર બજાર, રોકાણ અને ટ્રેડિંગ સંબંધિત પ્રશ્નોના જવાબ આપી શકું છું।',
          'kannada': 'ನಾನು ಷೇರು ಮಾರುಕಟ್ಟೆ, ಹೂಡಿಕೆಗಳು ಮತ್ತು ವ್ಯಾಪಾರಕ್ಕೆ ಸಂಬಂಧಿಸಿದ ಪ್ರಶ್ನೆಗಳಿಗೆ ಮಾತ್ರ ಉತ್ತರಿಸಬಲ್ಲೆ।',
          'malayalam': 'എനിക്ക് ഓഹരി വിപണി, നിക്ഷേപങ്ങൾ, ട്രേഡിംഗ് എന്നിവയുമായി ബന്ധപ്പെട്ട ചോദ്യങ്ങൾക്ക് മാത്രമേ ഉത്തരം നൽകാൻ കഴിയൂ।',
          'punjabi': 'ਮੈਂ ਸਿਰਫ਼ ਸਟਾਕ ਮਾਰਕੀਟ, ਨਿਵੇਸ਼ ਅਤੇ ਵਪਾਰ ਨਾਲ ਸਬੰਧਤ ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ ਦੇ ਸਕਦਾ ਹਾਂ।'
        };
        
        return {
          text: errorMessages[userLanguage] || errorMessages['english'],
          sources: [],
          isRelevant: false
        };
      }

      // Check if this query requires portfolio data
      const needsPortfolioData = this.requiresPortfolioData(userQuery);
      let portfolioData = null;
      let portfolioFetched = false;

      if (needsPortfolioData) {
        console.log('📊 Query requires portfolio data - fetching user portfolio...');
        portfolioFetched = true;
        
        // Get user's complete portfolio data (uses smart caching)
        portfolioData = await this.getUserPortfolioData(userId);
        
        if (!portfolioData) {
          console.log('⚠️ No portfolio data available for portfolio-specific query');
          const portfolioErrorMessages = {
            'english': 'I cannot access your portfolio data. Please make some trades first or ensure your account is properly set up.',
            'hindi': 'मुझे आपका पोर्टफोलियो डेटा नहीं मिल पा रहा। कृपया पहले कुछ स्टॉक खरीदें या अपना खाता सेट करें।',
            'telugu': 'మీ పోర్ట్‌ఫోలియో డేటాను నేను యాక్సెస్ చేయలేను. దయచేసి ముందుగా కొన్ని ట్రేడ్‌లు చేయండి.',
            'tamil': 'உங்கள் போர்ட்ஃபோலியோ தரவை என்னால் அணுக முடியவில்லை. தயவுசெய்து முதலில் சில வர்த்தகங்களைச் செய்யுங்கள்.',
            'bengali': 'আমি আপনার পোর্টফোলিও ডেটা অ্যাক্সেস করতে পারছি না। অনুগ্রহ করে প্রথমে কিছু ট্রেড করুন।',
            'marathi': 'मी तुमचा पोर्टफोलिओ डेटा अॅक्सेस करू शकत नाही. कृपया आधी काही ट्रेड्स करा.',
            'gujarati': 'હું તમારા પોર્ટફોલિયો ડેટાને ઍક્સેસ કરી શકતો નથી. કૃપા કરીને પહેલા કેટલાક ટ્રેડ્સ કરો.',
            'kannada': 'ನಾನು ನಿಮ್ಮ ಪೋರ್ಟ್‌ಫೋಲಿಯೋ ಡೇಟಾವನ್ನು ಪ್ರವೇಶಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಮೊದಲು ಕೆಲವು ವ್ಯಾಪಾರಗಳನ್ನು ಮಾಡಿ.',
            'malayalam': 'എനിക്ക് നിങ്ങളുടെ പോർട്ട്‌ഫോളിയോ ഡാറ്റ ആക്‌സസ് ചെയ്യാൻ കഴിയുന്നില്ല. ദയവായി ആദ്യം കുറച്ച് ട്രേഡുകൾ നടത്തുക.',
            'punjabi': 'ਮੈਂ ਤੁਹਾਡਾ ਪੋਰਟਫੋਲੀਓ ਡੇਟਾ ਐਕਸੈਸ ਨਹੀਂ ਕਰ ਸਕਦਾ। ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਕੁਝ ਵਪਾਰ ਕਰੋ।'
          };
          
          return {
            text: portfolioErrorMessages[userLanguage] || portfolioErrorMessages['english'],
            sources: [],
            isRelevant: true,
            portfolioRequired: true,
            portfolioFetched: false
          };
        }

        // Update conversation memory for context awareness
        this.updateConversationMemory(userId, userQuery, portfolioData);
        
        console.log(`📊 Portfolio data loaded: ${portfolioData.portfolio.holdingsCount} holdings, ₹${portfolioData.portfolio.totalPortfolioValue.toLocaleString()} value`);
      } else {
        console.log('🌐 General market query - skipping portfolio data fetch');
      }
      
      // Create context prompt with or without portfolio data
      const contextPrompt = this.createContextPrompt(userQuery, portfolioData, userLanguage);
      
      console.log('📝 Sending query to Gemini with' + (needsPortfolioData ? ' portfolio-specific' : ' general market') + ' context...');
      
      // Generate response with Google Search grounding
      const result = await this.model.generateContent(contextPrompt);
      
      // Process and clean the response
      const processedResponse = this.processResponse(result);
      
      // Enhance response with portfolio-specific insights if applicable
      let enhancedText = processedResponse.text;
      
      // Add real-time portfolio context if portfolio data was used
      if (portfolioData && (userQuery.toLowerCase().includes('portfolio') || userQuery.toLowerCase().includes('पोर्टफोलियो'))) {
        const quickStats = `\n\n📊 Quick Portfolio Summary:\n• Total Value: ₹${portfolioData.portfolio.totalPortfolioValue.toLocaleString()}\n• P&L: ₹${portfolioData.portfolio.totalProfitLoss.toFixed(2)} (${portfolioData.portfolio.totalProfitLossPercent.toFixed(2)}%)\n• Holdings: ${portfolioData.portfolio.holdingsCount} stocks`;
        enhancedText += quickStats;
      }
      
      console.log(`✅ ${needsPortfolioData ? 'Portfolio-aware' : 'General market'} response generated successfully`);
      
      return {
        text: enhancedText,
        sources: processedResponse.sources,
        isRelevant: true,
        portfolioData: portfolioData,
        portfolioRequired: needsPortfolioData,
        portfolioFetched: portfolioFetched,
        cacheUsed: needsPortfolioData ? this.isCacheValid(userId) : false,
        memoryContext: this.userConversationMemory.get(userId)?.queries?.length || 0,
        queryType: needsPortfolioData ? 'portfolio-specific' : 'general-market'
      };
      
    } catch (error) {
      console.error('❌ Error generating chatbot response:', error.message);
      
      const generalErrorMessages = {
        'english': 'Sorry, there seems to be a technical issue. Please try again in a moment.',
        'hindi': 'क्षमा करें, अभी कुछ तकनीकी समस्या है। कृपया थोड़ी देर बाद फिर कोशिश करें।',
        'telugu': 'క్షమించండి, ఇప్పుడు కొంత సాంకేతిక సమస్య ఉంది. దయచేసి కొద్దిసేపు తర్వాత మళ్లీ ప్రయత్నించండి.',
        'tamil': 'மன்னிக்கவும், இப்போது சில தொழில்நுட்ப சிக்கல் உள்ளது. தயவுசெய்து சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்.',
        'bengali': 'দুঃখিত, এখন কিছু প্রযুক্তিগত সমস্যা আছে। অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।',
        'marathi': 'क्षमस्व, सध्या काही तांत्रिक समस्या आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.',
        'gujarati': 'માફ કરશો, હવે કોઈ તકનીકી સમસ્યા છે. કૃપા કરીને થોડા સમય પછી ફરીથી પ્રયાસ કરો.',
        'kannada': 'ಕ್ಷಮಿಸಿ, ಈಗ ಸ್ವಲ್ಪ ತಾಂತ್ರಿಕ ಸಮಸ್ಯೆ ಇದೆ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
        'malayalam': 'ക്ഷമിക്കണം, ഇപ്പോൾ കുറച്ച് സാങ്കേതിക പ്രശ്‌നമുണ്ട്. ദയവായി കുറച്ച് സമയത്തിന് ശേഷം വീണ്ടും ശ്രമിക്കുക.',
        'punjabi': 'ਮਾਫ਼ ਕਰਨਾ, ਹੁਣ ਕੁਝ ਤਕਨੀਕੀ ਸਮੱਸਿਆ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਥੋੜ੍ਹੇ ਸਮੇਂ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
      };
      
      return {
        text: generalErrorMessages[userLanguage] || generalErrorMessages['english'],
        sources: [],
        isRelevant: true,
        error: error.message
      };
    }
  }

  /**
   * Force refresh portfolio cache (useful after trades)
   */
  async refreshPortfolioCache(userId) {
    console.log(`🔄 Force refreshing portfolio cache for user: ${userId}`);
    this.portfolioCache.delete(userId);
    return await this.getUserPortfolioData(userId);
  }

  /**
   * Get portfolio performance comparison
   */
  getPortfolioPerformanceInsights(userId) {
    const memory = this.userConversationMemory.get(userId);
    if (!memory || memory.portfolioSnapshots.length < 2) {
      return null;
    }

    const latest = memory.portfolioSnapshots[0];
    const previous = memory.portfolioSnapshots[1];
    const change = latest.value - previous.value;
    const changePercent = previous.value > 0 ? ((change / previous.value) * 100) : 0;

    return {
      valueChange: change,
      percentChange: changePercent,
      trend: change >= 0 ? 'positive' : 'negative',
      timeframe: 'recent'
    };
  }

  /**
   * Clear old cache and memory data
   */
  cleanupOldData() {
    const now = Date.now();
    const maxMemoryAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean expired cache
    for (const [userId, data] of this.portfolioCache.entries()) {
      if (now - data.timestamp > this.cacheExpiry) {
        this.portfolioCache.delete(userId);
      }
    }

    // Clean old conversation memory
    for (const [userId, memory] of this.userConversationMemory.entries()) {
      if (memory.queries.length > 0) {
        const lastQuery = new Date(memory.queries[0].timestamp);
        if (now - lastQuery.getTime() > maxMemoryAge) {
          this.userConversationMemory.delete(userId);
        }
      }
    }

    console.log('🧹 Cleaned up old cache and memory data');
  }

  /**
   * Get quick stock market tips for rural users
   */
  async getQuickTips(userLanguage = 'english') {
    const isHindi = userLanguage === 'hindi';
    
    const tips = isHindi ? [
      '💡 हमेशा अपनी जोखिम सहने की क्षमता के अनुसार निवेश करें',
      '📚 निवेश से पहले कंपनी के बारे में अच्छी तरह जानकारी लें',
      '🎯 अलग-अलग सेक्टर में निवेश करके रिस्क कम करें',
      '⏰ लंबी अवधि के लिए निवेश करें, जल्दबाजी न करें',
      '📈 नियमित रूप से अपने पोर्टफोलियो की समीक्षा करें'
    ] : [
      '💡 Always invest according to your risk tolerance',
      '📚 Research companies thoroughly before investing',
      '🎯 Diversify across different sectors to reduce risk',
      '⏰ Invest for the long term, avoid rushing',
      '📈 Review your portfolio regularly'
    ];

    return tips[Math.floor(Math.random() * tips.length)];
  }

  /**
   * Get service health status with cache statistics
   */
  getServiceStatus() {
    return {
      status: 'active',
      model: 'gemini-2.5-flash',
      features: [
        'Smart Portfolio Caching', 
        'Conversation Memory', 
        'Real-time Portfolio Analysis',
        'Google Search Grounding', 
        'Multi-language Support'
      ],
      apiConfigured: !!this.genAI,
      cacheStats: {
        cachedUsers: this.portfolioCache.size,
        memoryUsers: this.userConversationMemory.size,
        cacheExpiryMinutes: this.cacheExpiry / (60 * 1000)
      }
    };
  }

  /**
   * Initialize cleanup interval for memory management
   */
  startCleanupInterval() {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);
    
    console.log('🕐 Started automatic cleanup interval for cache and memory');
  }
}

module.exports = new ChatbotService();
