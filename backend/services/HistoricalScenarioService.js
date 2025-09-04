const HistoricalScenario = require('../models/HistoricalScenario');
const chatbotService = require('./ChatbotService');

class HistoricalScenarioService {
  constructor() {
    this.chatbotService = chatbotService;
    this.usageTracking = new Map(); // Track users who used scenarios
  }

  /**
   * Get all available historical scenarios
   */
  async getAvailableScenarios() {
    try {
      const scenarios = await HistoricalScenario.find({ isActive: true })
        .select('eventName eventDate description eventType geminiCalculated priority')
        .sort({ priority: -1, eventDate: -1 });
      
      return scenarios;
    } catch (error) {
      console.error('❌ Error fetching scenarios:', error);
      throw new Error('Failed to fetch historical scenarios');
    }
  }

  /**
   * Get or create a historical scenario with Gemini calculation
   */
  async getScenario(eventName) {
    try {
      let scenario = await HistoricalScenario.findOne({ eventName, isActive: true });
      
      if (!scenario) {
        // Create new scenario if it doesn't exist
        scenario = await this.createPredefinedScenario(eventName);
      }
      
      if (!scenario.geminiCalculated) {
        // Calculate impacts using Gemini
        await this.calculateScenarioImpacts(scenario);
      }
      
      return scenario;
    } catch (error) {
      console.error(`❌ Error getting scenario ${eventName}:`, error);
      throw new Error(`Failed to get scenario: ${eventName}`);
    }
  }

  /**
   * Create a predefined scenario
   */
  async createPredefinedScenario(eventName) {
    const predefinedScenarios = HistoricalScenario.getPredefinedScenarios();
    const scenarioData = predefinedScenarios.find(s => s.eventName === eventName);
    
    if (!scenarioData) {
      throw new Error(`Unknown scenario: ${eventName}`);
    }

    const scenario = new HistoricalScenario({
      ...scenarioData,
      sectorImpacts: [],
      stockImpacts: [],
      marketImpact: {
        overallMarketChange: 0,
        volatilityIncrease: 0,
        duration: '1_MONTH'
      },
      geminiCalculated: false,
      isActive: true,
      priority: this.getScenarioPriority(eventName)
    });

    await scenario.save();
    console.log(`✅ Created predefined scenario: ${eventName}`);
    return scenario;
  }

  /**
   * Calculate scenario impacts using Gemini AI
   */
  async calculateScenarioImpacts(scenario) {
    try {
      console.log(`🤖 Calculating impacts for ${scenario.eventName} using Gemini...`);
      
      const prompt = this.createScenarioCalculationPrompt(scenario);
      
      // Use Gemini to calculate impacts
      const response = await this.chatbotService.model.generateContent(prompt);
      const result = response.response.text();
      
      // Parse the Gemini response
      const impacts = this.parseGeminiResponse(result, scenario.eventName);
      
      // Update scenario with calculated impacts
      scenario.sectorImpacts = impacts.sectorImpacts;
      scenario.stockImpacts = impacts.stockImpacts;
      scenario.marketImpact = impacts.marketImpact;
      scenario.geminiCalculated = true;
      scenario.calculatedAt = new Date();
      scenario.dataSources = impacts.dataSources || [];
      
      await scenario.save();
      
      console.log(`✅ Calculated impacts for ${scenario.eventName}`);
      console.log(`   • Sector impacts: ${scenario.sectorImpacts.length}`);
      console.log(`   • Stock impacts: ${scenario.stockImpacts.length}`);
      console.log(`   • Market impact: ${scenario.marketImpact.overallMarketChange}%`);
      
      return scenario;
    } catch (error) {
      console.error(`❌ Error calculating impacts for ${scenario.eventName}:`, error);
      throw new Error('Failed to calculate scenario impacts');
    }
  }

  /**
   * Create prompt for Gemini to calculate historical impacts
   */
  createScenarioCalculationPrompt(scenario) {
    return `
You are a financial market analyst. Calculate the exact impact percentages for the historical market event: "${scenario.description}" that occurred on ${scenario.eventDate.toDateString()}.

Event: ${scenario.eventName}
Date: ${scenario.eventDate.toDateString()}
Type: ${scenario.eventType}

TASK: Provide precise impact percentages based on historical data for Indian stock market sectors and major stocks during this event.

REQUIRED OUTPUT FORMAT (JSON):
{
  "sectorImpacts": [
    {"sector": "Information Technology", "impactPercentage": -25.5, "description": "IT sector impact description"},
    {"sector": "Banking", "impactPercentage": -35.2, "description": "Banking sector impact"},
    {"sector": "Pharmaceuticals", "impactPercentage": 15.8, "description": "Pharma benefited"},
    {"sector": "FMCG", "impactPercentage": -8.5, "description": "FMCG impact"},
    {"sector": "Energy", "impactPercentage": -45.2, "description": "Energy sector hit hard"},
    {"sector": "Automobiles", "impactPercentage": -32.1, "description": "Auto sector decline"},
    {"sector": "Real Estate", "impactPercentage": -28.9, "description": "Real estate impact"},
    {"sector": "Metals", "impactPercentage": -22.3, "description": "Metals sector decline"}
  ],
  "stockImpacts": [
    {"symbol": "RELIANCE", "instrumentKey": "NSE_EQ|INE002A01018", "impactPercentage": -28.5, "sectorOverride": false},
    {"symbol": "TCS", "instrumentKey": "NSE_EQ|INE467B01029", "impactPercentage": -22.0, "sectorOverride": false},
    {"symbol": "HDFCBANK", "instrumentKey": "NSE_EQ|INE040A01034", "impactPercentage": -35.8, "sectorOverride": false},
    {"symbol": "INFY", "instrumentKey": "NSE_EQ|INE009A01021", "impactPercentage": -24.2, "sectorOverride": false},
    {"symbol": "ICICIBANK", "instrumentKey": "NSE_EQ|INE090A01013", "impactPercentage": -33.5, "sectorOverride": false},
    {"symbol": "HINDUNILVR", "instrumentKey": "NSE_EQ|INE030A01027", "impactPercentage": -5.2, "sectorOverride": false},
    {"symbol": "ITC", "instrumentKey": "NSE_EQ|INE154A01025", "impactPercentage": -12.8, "sectorOverride": false},
    {"symbol": "SBIN", "instrumentKey": "NSE_EQ|INE062A01020", "impactPercentage": -38.9, "sectorOverride": false}
  ],
  "marketImpact": {
    "overallMarketChange": -30.2,
    "volatilityIncrease": 250.5,
    "duration": "3_MONTHS"
  },
  "dataSources": [
    {"source": "NSE Historical Data", "reliability": 0.95},
    {"source": "BSE Archives", "reliability": 0.90},
    {"source": "RBI Reports", "reliability": 0.85}
  ]
}

IMPORTANT INSTRUCTIONS:
1. Use REAL historical data for this specific event
2. Negative percentages indicate losses, positive indicate gains
3. Be precise with percentages (use decimals)
4. Focus on Indian stock market (NSE/BSE)
5. Include major Indian stocks commonly held in portfolios
6. Sector impacts should reflect actual market movements during this period
7. Stock impacts can override sector impacts if individual stocks performed differently
8. Market impact should reflect the overall Nifty/Sensex movement
9. Volatility increase should be realistic for the event magnitude
10. Duration should match how long the impact lasted

Return ONLY the JSON object, no additional text or explanations.
`;
  }

  /**
   * Parse Gemini response and extract impact data
   */
  parseGeminiResponse(responseText, eventName) {
    try {
      // Clean the response text
      let cleanedText = responseText.trim();
      
      // Remove markdown code blocks if present
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to find JSON object in the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }
      
      // Parse JSON
      const impacts = JSON.parse(cleanedText);
      
      // Validate required fields
      if (!impacts.sectorImpacts || !impacts.stockImpacts || !impacts.marketImpact) {
        throw new Error('Missing required impact data');
      }
      
      // Validate sector impacts
      impacts.sectorImpacts = impacts.sectorImpacts.filter(sector => 
        sector.sector && typeof sector.impactPercentage === 'number'
      );
      
      // Validate stock impacts
      impacts.stockImpacts = impacts.stockImpacts.filter(stock => 
        stock.symbol && stock.instrumentKey && typeof stock.impactPercentage === 'number'
      );
      
      console.log(`✅ Parsed Gemini response for ${eventName}:`);
      console.log(`   • Sectors: ${impacts.sectorImpacts.length}`);
      console.log(`   • Stocks: ${impacts.stockImpacts.length}`);
      console.log(`   • Market: ${impacts.marketImpact.overallMarketChange}%`);
      
      return impacts;
      
    } catch (error) {
      console.error(`❌ Error parsing Gemini response for ${eventName}:`, error);
      console.error('Response text:', responseText);
      
      // Return fallback data if parsing fails
      return this.getFallbackImpacts(eventName);
    }
  }

  /**
   * Get fallback impact data if Gemini parsing fails
   */
  getFallbackImpacts(eventName) {
    const fallbackData = {
      'COVID_CRASH_2020': {
        sectorImpacts: [
          { sector: 'Information Technology', impactPercentage: -25.0, description: 'IT sector declined during COVID crash' },
          { sector: 'Banking', impactPercentage: -35.0, description: 'Banking sector heavily impacted' },
          { sector: 'Pharmaceuticals', impactPercentage: 15.0, description: 'Pharma sector benefited' },
          { sector: 'FMCG', impactPercentage: -8.0, description: 'FMCG saw moderate decline' }
        ],
        stockImpacts: [
          { symbol: 'RELIANCE', instrumentKey: 'NSE_EQ|INE002A01018', impactPercentage: -30.0, sectorOverride: false },
          { symbol: 'TCS', instrumentKey: 'NSE_EQ|INE467B01029', impactPercentage: -20.0, sectorOverride: false },
          { symbol: 'HDFCBANK', instrumentKey: 'NSE_EQ|INE040A01034', impactPercentage: -35.0, sectorOverride: false }
        ],
        marketImpact: { overallMarketChange: -30.0, volatilityIncrease: 200.0, duration: '3_MONTHS' }
      },
      'FINANCIAL_CRISIS_2008': {
        sectorImpacts: [
          { sector: 'Banking', impactPercentage: -50.0, description: 'Banking sector crashed' },
          { sector: 'Information Technology', impactPercentage: -20.0, description: 'IT sector moderate decline' },
          { sector: 'FMCG', impactPercentage: 5.0, description: 'FMCG remained resilient' }
        ],
        stockImpacts: [
          { symbol: 'HDFCBANK', instrumentKey: 'NSE_EQ|INE040A01034', impactPercentage: -55.0, sectorOverride: false },
          { symbol: 'ICICIBANK', instrumentKey: 'NSE_EQ|INE090A01013', impactPercentage: -60.0, sectorOverride: false }
        ],
        marketImpact: { overallMarketChange: -40.0, volatilityIncrease: 300.0, duration: '6_MONTHS' }
      },
      'DOTCOM_BUBBLE_2000': {
        sectorImpacts: [
          { sector: 'Information Technology', impactPercentage: -70.0, description: 'IT sector devastated' },
          { sector: 'Banking', impactPercentage: -10.0, description: 'Banking less affected' }
        ],
        stockImpacts: [
          { symbol: 'TCS', instrumentKey: 'NSE_EQ|INE467B01029', impactPercentage: -75.0, sectorOverride: false },
          { symbol: 'INFY', instrumentKey: 'NSE_EQ|INE009A01021', impactPercentage: -80.0, sectorOverride: false }
        ],
        marketImpact: { overallMarketChange: -35.0, volatilityIncrease: 400.0, duration: '1_YEAR' }
      }
    };

    return fallbackData[eventName] || {
      sectorImpacts: [],
      stockImpacts: [],
      marketImpact: { overallMarketChange: -20.0, volatilityIncrease: 100.0, duration: '1_MONTH' }
    };
  }

  /**
   * Apply scenario to user's portfolio
   */
  async applyScenarioToPortfolio(scenarioId, userId) {
    try {
      const scenario = await HistoricalScenario.findById(scenarioId);
      if (!scenario) {
        throw new Error('Scenario not found');
      }

      // Get user's current portfolio data
      const portfolioData = await this.chatbotService.getUserPortfolioData(userId);
      if (!portfolioData || !portfolioData.portfolio.portfolio.length) {
        throw new Error('No portfolio data found for user');
      }

      const currentPortfolio = portfolioData.portfolio.portfolio;
      
      // Normalize field names for frontend compatibility
      const normalizedCurrentPortfolio = currentPortfolio.map(holding => ({
        ...holding,
        profitLoss: holding.pnl || holding.profitLoss || 0,
        profitLossPercent: holding.pnlPercent || holding.profitLossPercent || 0,
        totalInvested: holding.investment || holding.totalInvested || 0
      }));
      
      // Apply scenario impacts to each holding
      const historicalPortfolio = scenario.applyToPortfolio(normalizedCurrentPortfolio);
      
      // Calculate portfolio-level summaries
      const summary = this.calculatePortfolioSummary(normalizedCurrentPortfolio, historicalPortfolio);
      
      // Track usage
      const isNewUser = !this.usageTracking.has(userId);
      scenario.incrementUsage(isNewUser);
      this.usageTracking.set(userId, true);
      await scenario.save();
      
      return {
        scenario: {
          eventName: scenario.eventName,
          description: scenario.description,
          eventDate: scenario.eventDate,
          eventType: scenario.eventType
        },
        current: {
          portfolio: normalizedCurrentPortfolio,
          summary: summary.current
        },
        historical: {
          portfolio: historicalPortfolio,
          summary: summary.historical
        },
        comparison: summary.comparison
      };
      
    } catch (error) {
      console.error(`❌ Error applying scenario to portfolio:`, error);
      throw new Error('Failed to apply scenario to portfolio');
    }
  }

  /**
   * Calculate portfolio summaries for comparison
   */
  calculatePortfolioSummary(currentPortfolio, historicalPortfolio) {
    const currentSummary = {
      totalInvested: currentPortfolio.reduce((sum, h) => sum + (h.totalInvested || 0), 0),
      totalValue: currentPortfolio.reduce((sum, h) => sum + h.currentValue, 0),
      totalProfitLoss: currentPortfolio.reduce((sum, h) => sum + (h.profitLoss || 0), 0),
      holdingCount: currentPortfolio.length
    };
    
    const historicalSummary = {
      totalInvested: historicalPortfolio.reduce((sum, h) => sum + (h.totalInvested || 0), 0),
      totalValue: historicalPortfolio.reduce((sum, h) => sum + h.historicalValue, 0),
      totalProfitLoss: historicalPortfolio.reduce((sum, h) => sum + h.historicalProfitLoss, 0),
      holdingCount: historicalPortfolio.length
    };
    
    currentSummary.totalProfitLossPercent = currentSummary.totalInvested > 0 
      ? ((currentSummary.totalProfitLoss / currentSummary.totalInvested) * 100) 
      : 0;
      
    historicalSummary.totalProfitLossPercent = historicalSummary.totalInvested > 0 
      ? ((historicalSummary.totalProfitLoss / historicalSummary.totalInvested) * 100) 
      : 0;
    
    const comparison = {
      valueDifference: historicalSummary.totalValue - currentSummary.totalValue,
      valueChangePercent: currentSummary.totalValue > 0 
        ? (((historicalSummary.totalValue - currentSummary.totalValue) / currentSummary.totalValue) * 100)
        : 0,
      pnlDifference: historicalSummary.totalProfitLoss - currentSummary.totalProfitLoss,
      worstImpactStock: this.findWorstImpactStock(historicalPortfolio),
      bestImpactStock: this.findBestImpactStock(historicalPortfolio)
    };
    
    return { current: currentSummary, historical: historicalSummary, comparison };
  }

  /**
   * Find stock with worst impact in scenario
   */
  findWorstImpactStock(historicalPortfolio) {
    return historicalPortfolio.reduce((worst, stock) => 
      stock.impactPercentage < worst.impactPercentage ? stock : worst
    );
  }

  /**
   * Find stock with best impact in scenario
   */
  findBestImpactStock(historicalPortfolio) {
    return historicalPortfolio.reduce((best, stock) => 
      stock.impactPercentage > best.impactPercentage ? stock : best
    );
  }

  /**
   * Get scenario priority for ordering
   */
  getScenarioPriority(eventName) {
    const priorities = {
      'COVID_CRASH_2020': 10,
      'FINANCIAL_CRISIS_2008': 9,
      'DOTCOM_BUBBLE_2000': 8
    };
    return priorities[eventName] || 5;
  }

  /**
   * Initialize predefined scenarios
   */
  async initializePredefinedScenarios() {
    try {
      console.log('🚀 Initializing predefined historical scenarios...');
      
      const predefinedScenarios = HistoricalScenario.getPredefinedScenarios();
      
      for (const scenarioData of predefinedScenarios) {
        const existing = await HistoricalScenario.findOne({ eventName: scenarioData.eventName });
        
        if (!existing) {
          await this.createPredefinedScenario(scenarioData.eventName);
          console.log(`✅ Initialized scenario: ${scenarioData.eventName}`);
        } else {
          console.log(`⏭️  Scenario already exists: ${scenarioData.eventName}`);
        }
      }
      
      console.log('✅ Predefined scenarios initialization complete');
    } catch (error) {
      console.error('❌ Error initializing predefined scenarios:', error);
    }
  }

  /**
   * Get service status and statistics
   */
  async getServiceStatus() {
    try {
      const totalScenarios = await HistoricalScenario.countDocuments();
      const calculatedScenarios = await HistoricalScenario.countDocuments({ geminiCalculated: true });
      const activeScenarios = await HistoricalScenario.countDocuments({ isActive: true });
      
      const usageStats = await HistoricalScenario.aggregate([
        { $group: { 
          _id: null, 
          totalUsage: { $sum: '$usageStats.timesUsed' },
          totalUniqueUsers: { $sum: '$usageStats.uniqueUsers' }
        }}
      ]);
      
      return {
        totalScenarios,
        calculatedScenarios,
        activeScenarios,
        pendingCalculation: totalScenarios - calculatedScenarios,
        totalUsage: usageStats[0]?.totalUsage || 0,
        totalUniqueUsers: usageStats[0]?.totalUniqueUsers || 0,
        activeUsers: this.usageTracking.size
      };
    } catch (error) {
      console.error('❌ Error getting service status:', error);
      return { error: error.message };
    }
  }
}

module.exports = HistoricalScenarioService;
