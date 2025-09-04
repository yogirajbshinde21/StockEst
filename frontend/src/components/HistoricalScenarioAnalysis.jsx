import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import AnimatedPrice from './AnimatedPrice';
import Trans from './Trans';
import { useSocket } from '../context/SocketContext';
import { usePriceTracker } from '../hooks/usePriceTracker';
import { 
  History, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  Calendar,
  Info,
  ArrowRight,
  BarChart3,
  Target
} from 'lucide-react';
import './HistoricalScenarioAnalysis.css';

const HistoricalScenarioAnalysis = ({ currentPortfolioData }) => {
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState(null);
  const [analyzingScenario, setAnalyzingScenario] = useState(null); // Track which scenario is being analyzed
    const [previousPortfolioValues, setPreviousPortfolioValues] = useState({
    totalValue: 0,
    totalProfitLoss: 0,
    holdings: {},
    historical: {
      totalValue: 0,
      totalProfitLoss: 0,
      holdings: {}
    },
    comparison: {
      valueDifference: 0,
      valueChangePercent: 0
    }
  });
  
  // Real-time data hooks
  const { stockData, isConnected } = useSocket(); // Only get data, don't subscribe here
  
  // Extract stocks from current portfolio for price tracking
  const portfolioStocks = useMemo(() => {
    const stocks = currentPortfolioData?.portfolio?.map(holding => ({
      instrumentKey: holding.instrumentKey,
      currentPrice: holding.currentPrice
    })).filter(stock => stock.instrumentKey) || [];
    
    console.log('📊 Portfolio stocks for tracking:', stocks.length, stocks.map(s => `${s.instrumentKey.split('|')[1]}:₹${s.currentPrice}`));
    return stocks;
  }, [currentPortfolioData?.portfolio]);
  
  const { getPriceInfo } = usePriceTracker(portfolioStocks, 'instrumentKey', 'currentPrice');

  // Remove manual subscription - Portfolio component should handle this
  // The HistoricalScenarioAnalysis will receive stock data through the context

  // Calculate real-time portfolio values with live stock prices (optimized)
  const calculateRealTimePortfolio = useCallback((portfolio) => {
    if (!portfolio || !Array.isArray(portfolio) || portfolio.length === 0) {
      return null;
    }
    
    let totalCurrentValue = 0;
    let totalInvested = 0;
    let hasUpdates = false;
    
    const updatedPortfolio = portfolio.map(holding => {
      if (!holding || !holding.instrumentKey) {
        return holding;
      }
      
      // Get real-time price from multiple sources
      const liveStock = stockData?.stocks?.find(stock => stock.instrumentKey === holding.instrumentKey);
      const priceInfo = getPriceInfo(holding.instrumentKey);
      const livePrice = liveStock?.currentPrice || priceInfo.currentPrice || holding.currentPrice;
      
      // Always check for updates to ensure real-time responsiveness
      if (livePrice !== holding.currentPrice) {
        hasUpdates = true;
      }
      
      const currentValue = (holding.quantity || 0) * livePrice;
      const profitLoss = currentValue - (holding.totalInvested || 0);
      const profitLossPercent = (holding.totalInvested || 0) > 0 ? (profitLoss / holding.totalInvested) * 100 : 0;
      
      totalCurrentValue += currentValue;
      totalInvested += (holding.totalInvested || 0);
      
      return {
        ...holding,
        currentPrice: livePrice,
        currentValue,
        profitLoss,
        profitLossPercent
      };
    });
    
    if (!hasUpdates) {
      return null; // Return null if no significant updates
    }
    
    const totalProfitLoss = totalCurrentValue - totalInvested;
    const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
    
    return {
      portfolio: updatedPortfolio,
      summary: {
        currentValue: totalCurrentValue,
        totalInvested,
        totalProfitLoss,
        totalProfitLossPercent
      }
    };
  }, [stockData?.stocks, getPriceInfo]);

  // Calculate real-time historical portfolio values with current prices + scenario impacts
  const calculateRealTimeHistoricalPortfolio = useCallback((historicalPortfolio, currentPortfolio) => {
    if (!historicalPortfolio || !Array.isArray(historicalPortfolio) || historicalPortfolio.length === 0) {
      return historicalPortfolio || [];
    }
    
    return historicalPortfolio.map(historicalHolding => {
      if (!historicalHolding || !historicalHolding.instrumentKey) {
        return historicalHolding;
      }
      
      // Find the corresponding current portfolio holding to get live price
      const currentHolding = currentPortfolio.find(current => 
        current.instrumentKey === historicalHolding.instrumentKey
      );
      
      if (!currentHolding) {
        return historicalHolding; // No current data, keep original
      }
      
      // Get current live price
      const livePrice = currentHolding.currentPrice;
      
      // Calculate the impact ratio from the original scenario analysis
      // This represents how much the historical scenario affected the stock price
      let impactRatio = 1;
      
      // Method 1: Use stored original prices if available
      if (historicalHolding.originalHistoricalPrice && currentHolding.originalCurrentPrice && currentHolding.originalCurrentPrice > 0) {
        impactRatio = historicalHolding.originalHistoricalPrice / currentHolding.originalCurrentPrice;
      }
      // Method 2: Calculate from current data if originals not available
      else if (historicalHolding.historicalPrice && currentHolding.currentPrice > 0) {
        // Store original prices for future calculations if not already stored
        if (!historicalHolding.originalHistoricalPrice) {
          historicalHolding.originalHistoricalPrice = historicalHolding.historicalPrice;
        }
        if (!currentHolding.originalCurrentPrice) {
          currentHolding.originalCurrentPrice = currentHolding.currentPrice;
        }
        impactRatio = historicalHolding.historicalPrice / currentHolding.currentPrice;
      }
      
      console.log(`📊 Historical Real-time Update for ${historicalHolding.symbol}:`, {
        livePrice: livePrice.toFixed(2),
        originalCurrent: currentHolding.originalCurrentPrice?.toFixed(2) || 'N/A',
        originalHistorical: historicalHolding.originalHistoricalPrice?.toFixed(2) || 'N/A',
        impactRatio: impactRatio.toFixed(4),
        newHistoricalPrice: (livePrice * impactRatio).toFixed(2)
      });
      
      // Apply the impact ratio to the current live price
      const historicalPrice = livePrice * impactRatio;
      const historicalValue = (historicalHolding.quantity || 0) * historicalPrice;
      const historicalProfitLoss = historicalValue - (historicalHolding.totalInvested || 0);
      const historicalProfitLossPercent = (historicalHolding.totalInvested || 0) > 0 ? 
        (historicalProfitLoss / historicalHolding.totalInvested) * 100 : 0;
      
      return {
        ...historicalHolding,
        historicalPrice,
        historicalValue,
        historicalProfitLoss,
        historicalProfitLossPercent,
        originalHistoricalPrice: historicalHolding.originalHistoricalPrice // Preserve for future calculations
      };
    });
  }, []);

  // Format currency helper (kept for potential use)
  // eslint-disable-next-line no-unused-vars
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // Format percentage helper
  const formatPercent = (percent) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${(percent || 0).toFixed(2)}%`;
  };

  // Fetch available scenarios
  const fetchScenarios = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/portfolio/historical-scenarios');
      setScenarios(response.data.data.scenarios);
      
      // If no scenarios exist, initialize them
      if (response.data.data.scenarios.length === 0) {
        await initializeScenarios();
      }
    } catch (err) {
      console.error('Error fetching scenarios:', err);
      setError('Failed to load historical scenarios');
    } finally {
      setLoading(false);
    }
  };

  // Initialize predefined scenarios
  const initializeScenarios = async () => {
    try {
      const response = await axios.post('/api/portfolio/initialize-scenarios');
      setScenarios(response.data.data.scenarios);
    } catch (err) {
      console.error('Error initializing scenarios:', err);
    }
  };

  // Analyze selected scenario
  const analyzeScenario = async (eventName) => {
    try {
      setAnalyzingScenario(eventName);
      setError(null);
      
      // Clear previous analysis if selecting a different scenario
      if (selectedScenario !== eventName) {
        setAnalysisData(null);
        setSelectedScenario(null);
      }
      
      const response = await axios.get(`/api/portfolio/scenario-by-name/${eventName}`);
      const scenarioData = response.data.data;
      
      // Store original prices in the holdings for impact ratio calculations
      if (scenarioData.current?.portfolio) {
        scenarioData.current.portfolio = scenarioData.current.portfolio.map(holding => ({
          ...holding,
          originalCurrentPrice: holding.currentPrice // Store original price for ratio calculation
        }));
      }
      
      if (scenarioData.historical?.portfolio) {
        scenarioData.historical.portfolio = scenarioData.historical.portfolio.map(holding => ({
          ...holding,
          originalHistoricalPrice: holding.historicalPrice // Store original historical price
        }));
      }
      
      setAnalysisData(scenarioData);
      setSelectedScenario(eventName);
    } catch (err) {
      console.error('Error analyzing scenario:', err);
      setError('Failed to analyze scenario. Please try again.');
    } finally {
      setAnalyzingScenario(null);
    }
  };

  // Effect to update analysis data with real-time prices (heavily throttled and guarded)
  useEffect(() => {
    // Multiple guards to prevent excessive updates
    if (!analysisData?.current?.portfolio || 
        analyzingScenario || 
        !stockData?.stocks?.length || 
        !isConnected) {
      return;
    }

    // Throttle updates heavily to prevent excessive re-renders
    const timeoutId = setTimeout(() => {
      try {
        // Store current values as previous before updating (essential for animations)
        const currentTotalValue = analysisData.current.summary.totalValue;
        const currentTotalProfitLoss = analysisData.current.summary.totalProfitLoss;
        const currentHistoricalTotalValue = analysisData.historical.summary.totalValue;
        const currentHistoricalTotalProfitLoss = analysisData.historical.summary.totalProfitLoss;
        const currentHoldings = {};
        const currentHistoricalHoldings = {};
        const currentComparison = {
          valueDifference: analysisData.comparison?.valueDifference || 0,
          valueChangePercent: analysisData.comparison?.valueChangePercent || 0
        };
        
        // Extract current holding values
        analysisData.current.portfolio.forEach(holding => {
          if (holding?.instrumentKey) {
            currentHoldings[holding.instrumentKey] = {
              currentPrice: holding.currentPrice,
              currentValue: holding.currentValue,
              profitLoss: holding.profitLoss
            };
          }
        });
        
        // Extract current historical holding values
        analysisData.historical.portfolio.forEach(holding => {
          if (holding?.instrumentKey) {
            currentHistoricalHoldings[holding.instrumentKey] = {
              historicalPrice: holding.historicalPrice,
              historicalValue: holding.historicalValue,
              historicalProfitLoss: holding.historicalProfitLoss
            };
          }
        });
        
        // Update previous values for animations
        setPreviousPortfolioValues({
          totalValue: currentTotalValue,
          totalProfitLoss: currentTotalProfitLoss,
          holdings: currentHoldings,
          historical: {
            totalValue: currentHistoricalTotalValue,
            totalProfitLoss: currentHistoricalTotalProfitLoss,
            holdings: currentHistoricalHoldings
          },
          comparison: currentComparison
        });
        
        // Small delay to ensure previous values are set before new values
        setTimeout(() => {
          // Update current portfolio with real-time prices
          const realTimePortfolioResult = calculateRealTimePortfolio(analysisData.current.portfolio);
          
          if (realTimePortfolioResult && realTimePortfolioResult.portfolio) {
            // Extract the updated portfolio array
            const realTimeCurrentPortfolio = realTimePortfolioResult.portfolio;
            
            // Calculate updated summary with real-time prices
            const totalValue = realTimeCurrentPortfolio.reduce((sum, holding) => sum + holding.currentValue, 0);
            const totalProfitLoss = realTimeCurrentPortfolio.reduce((sum, holding) => sum + holding.profitLoss, 0);
            const totalInvestment = totalValue - totalProfitLoss;
            
            // Update historical portfolio with real-time prices and scenario impacts
            const realTimeHistoricalPortfolio = calculateRealTimeHistoricalPortfolio(analysisData.historical.portfolio, realTimeCurrentPortfolio);
            const historicalTotalValue = realTimeHistoricalPortfolio.reduce((sum, holding) => sum + (holding.historicalValue || 0), 0);
            const historicalTotalProfitLoss = realTimeHistoricalPortfolio.reduce((sum, holding) => sum + (holding.historicalProfitLoss || 0), 0);
            const historicalTotalInvestment = historicalTotalValue - historicalTotalProfitLoss;
            
            console.log('📊 Historical Scenarios Real-time Update:', {
              currentTotalValue: totalValue.toFixed(2),
              currentTotalProfitLoss: totalProfitLoss.toFixed(2),
              historicalTotalValue: historicalTotalValue.toFixed(2),
              historicalTotalProfitLoss: historicalTotalProfitLoss.toFixed(2),
              stockCount: realTimeCurrentPortfolio.length,
              historicalStockCount: realTimeHistoricalPortfolio.length,
              previousCurrentValue: currentTotalValue.toFixed(2),
              previousHistoricalValue: currentHistoricalTotalValue.toFixed(2),
              currentValueChanged: totalValue !== currentTotalValue,
              historicalValueChanged: historicalTotalValue !== currentHistoricalTotalValue
            });
            
            // Calculate updated comparison with real-time values from both portfolios
            const updatedComparison = {
              ...analysisData.comparison,
              valueDifference: totalValue - historicalTotalValue,
              valueChangePercent: historicalTotalValue > 0 
                ? ((totalValue - historicalTotalValue) / historicalTotalValue) * 100
                : 0
            };
            
            setAnalysisData(prevData => ({
              ...prevData,
              lastUpdated: Date.now(),
              current: {
                ...prevData.current,
                portfolio: realTimeCurrentPortfolio,
                summary: {
                  ...prevData.current.summary,
                  totalValue: totalValue,
                  totalProfitLoss: totalProfitLoss,
                  totalProfitLossPercent: totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0
                }
              },
              historical: {
                ...prevData.historical,
                portfolio: realTimeHistoricalPortfolio,
                summary: {
                  ...prevData.historical.summary,
                  totalValue: historicalTotalValue,
                  totalProfitLoss: historicalTotalProfitLoss,
                  totalProfitLossPercent: historicalTotalInvestment > 0 ? (historicalTotalProfitLoss / historicalTotalInvestment) * 100 : 0
                }
              },
              comparison: updatedComparison
            }));
          } else {
            console.log('📊 No real-time updates needed - prices unchanged');
          }
        }, 50); // 50ms delay to ensure proper animation timing
      } catch (error) {
        console.error('📊 Error in real-time portfolio update:', error);
      }
    }, 1000); // Reduced throttle to 1 second for more responsive animations
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockData?.lastUpdated]); // Intentionally limited dependencies to prevent excessive triggers

  // Load scenarios on component mount
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get('/api/portfolio/historical-scenarios');
        setScenarios(response.data.data.scenarios);
        
        // If no scenarios exist, initialize them
        if (response.data.data.scenarios.length === 0) {
          await initializeScenarios();
        }
      } catch (err) {
        console.error('Error fetching scenarios:', err);
        setError('Failed to load historical scenarios');
      } finally {
        setLoading(false);
      }
    };

    loadScenarios();
  }, []);

  // Scenario card component (memoized to prevent unnecessary re-renders)
  const ScenarioCard = React.memo(({ scenario }) => {
    const isSelected = selectedScenario === scenario.eventName;
    const isAnalyzing = analyzingScenario === scenario.eventName;
    const isClickable = !analyzingScenario; // Only clickable when no scenario is being analyzed
    
    return (
      <div 
        className={`scenario-card ${isSelected ? 'selected' : ''} ${isAnalyzing ? 'calculating' : ''}`}
        onClick={() => isClickable && analyzeScenario(scenario.eventName)}
        style={{ cursor: isClickable ? 'pointer' : 'not-allowed', opacity: isClickable ? 1 : 0.7 }}
      >
        <div className="scenario-header">
          <div className="scenario-icon">
            <History size={24} />
          </div>
          <div className="scenario-info">
            <h3 className="scenario-name">{scenario.eventName.replace(/_/g, ' ')}</h3>
            <p className="scenario-description">{scenario.description}</p>
          </div>
        </div>
        
        <div className="scenario-meta">
          <div className="scenario-date">
            <Calendar size={16} />
            {new Date(scenario.eventDate).toLocaleDateString()}
          </div>
          <div className={`scenario-status ${isAnalyzing ? 'calculating' : 'ready'}`}>
            {isAnalyzing ? 'Calculating...' : 'Ready'}
          </div>
        </div>
        
        {isAnalyzing && (
          <div className="scenario-analyzing">
            <RefreshCw size={16} className="spin" />
            <span>Analyzing...</span>
          </div>
        )}
      </div>
    );
  });

  // Portfolio comparison component
  const PortfolioComparison = ({ data }) => {
    if (!data) return null;

    const { current, historical, comparison, scenario } = data;
    
    // Add safety checks for required data
    if (!current || !current.summary || !historical || !historical.summary || !scenario) {
      console.error('📊 PortfolioComparison: Missing required data', { current, historical, scenario });
      return (
        <div className="portfolio-comparison">
          <div className="error-message">
            <AlertTriangle size={24} />
            <p>Unable to load portfolio comparison data. Please try selecting the scenario again.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="portfolio-comparison">
        <div className="comparison-header">
          <h2>
            <Target size={24} />
            Live Scenario Analysis: {scenario.eventName.replace(/_/g, ' ')}
          </h2>
          <p>{scenario.description} - Real-time updates with live market prices</p>
          <div className={`real-time-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className="status-indicator"></div>
            <span className="status-text">
              {isConnected ? 'Real-time updates active' : 'Real-time updates disconnected'}
            </span>
            {stockData?.lastUpdated && (
              <span className="last-updated">
                • Last updated: {new Date(stockData.lastUpdated).toLocaleTimeString()}
              </span>
            )}
            {!analyzingScenario && analysisData && (
              <span className="update-frequency">
                • Updating every 1s
              </span>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-comparison">
          <div className="summary-card current">
            <div className="summary-header">
              <h3>Current Portfolio</h3>
              <div className="summary-icon current">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-label">Total Value</span>
                <span className="stat-value">
                  <AnimatedPrice
                    key={`total-value-${analysisData?.lastUpdated || Date.now()}`}
                    value={current.summary.totalValue}
                    previousValue={previousPortfolioValues.totalValue || current.summary.totalValue}
                    currency={true}
                    decimals={2}
                    showArrow={false}
                    showChange={false}
                    size="medium"
                  />
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Total P&L</span>
                <span className={`stat-value ${current.summary.totalProfitLoss >= 0 ? 'profit' : 'loss'}`}>
                  <AnimatedPrice
                    key={`total-pnl-${analysisData?.lastUpdated || Date.now()}`}
                    value={current.summary.totalProfitLoss}
                    previousValue={previousPortfolioValues.totalProfitLoss || current.summary.totalProfitLoss}
                    currency={true}
                    decimals={2}
                    showArrow={false}
                    showChange={false}
                    size="medium"
                  />
                  <span className="pnl-percent">
                    ({formatPercent(current.summary.totalProfitLossPercent)})
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="comparison-arrow">
            <ArrowRight size={24} />
          </div>

          <div className="summary-card historical">
            <div className="summary-header">
              <h3>During {scenario.eventName.replace(/_/g, ' ')}</h3>
              <div className="summary-icon historical">
                <TrendingDown size={20} />
              </div>
            </div>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-label">Total Value</span>
                <span className="stat-value">
                  <AnimatedPrice
                    key={`historical-total-value-${analysisData?.lastUpdated || Date.now()}`}
                    value={historical.summary.totalValue}
                    previousValue={previousPortfolioValues.historical.totalValue || historical.summary.totalValue}
                    currency={true}
                    decimals={2}
                    showArrow={false}
                    showChange={false}
                    size="medium"
                  />
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Total P&L</span>
                <span className={`stat-value ${historical.summary.totalProfitLoss >= 0 ? 'profit' : 'loss'}`}>
                  <AnimatedPrice
                    key={`historical-total-pnl-${analysisData?.lastUpdated || Date.now()}`}
                    value={historical.summary.totalProfitLoss}
                    previousValue={previousPortfolioValues.historical.totalProfitLoss || historical.summary.totalProfitLoss}
                    currency={true}
                    decimals={2}
                    showArrow={false}
                    showChange={false}
                    size="medium"
                  />
                  <span className="pnl-percent">
                    ({formatPercent(historical.summary.totalProfitLossPercent)})
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Impact Summary */}
        <div className="impact-summary">
          <div className="impact-card">
            <h4>Overall Impact</h4>
            <div className={`impact-value ${comparison.valueDifference >= 0 ? 'positive' : 'negative'}`}>
              <AnimatedPrice
                key={`impact-value-${analysisData?.lastUpdated || Date.now()}`}
                value={comparison.valueDifference}
                previousValue={previousPortfolioValues.comparison.valueDifference}
                currency={true}
                decimals={2}
                showArrow={true}
                showChange={false}
                size="medium"
              />
              <span className="impact-percent">
                (<AnimatedPrice
                  key={`impact-percent-${analysisData?.lastUpdated || Date.now()}`}
                  value={comparison.valueChangePercent}
                  previousValue={previousPortfolioValues.comparison.valueChangePercent}
                  currency={false}
                  decimals={2}
                  showArrow={false}
                  showChange={false}
                  size="small"
                  suffix="%"
                />)
              </span>
            </div>
          </div>
          
          <div className="impact-card">
            <h4>Worst Affected Stock</h4>
            <div className="impact-stock worst">
              <span className="stock-symbol">{comparison.worstImpactStock?.symbol}</span>
              <span className="stock-impact">{formatPercent(comparison.worstImpactStock?.impactPercentage)}</span>
            </div>
          </div>
          
          <div className="impact-card">
            <h4>Best Performing Stock</h4>
            <div className="impact-stock best">
              <span className="stock-symbol">{comparison.bestImpactStock?.symbol}</span>
              <span className="stock-impact">{formatPercent(comparison.bestImpactStock?.impactPercentage)}</span>
            </div>
          </div>
        </div>

        {/* Split Portfolio View */}
        <div className="split-portfolio">
          <div className="portfolio-half current-portfolio">
            <h3>Current Portfolio (Live Prices)</h3>
            <PortfolioTable holdings={current.portfolio} type="current" />
          </div>
          
          <div className="portfolio-half historical-portfolio">
            <h3>Historical Scenario (Live Prices + Impact)</h3>
            <PortfolioTable holdings={historical.portfolio} type="historical" />
          </div>
        </div>
      </div>
    );
  };

  // Portfolio table component (memoized)
  const PortfolioTable = React.memo(({ holdings, type }) => {
    if (!holdings || !Array.isArray(holdings)) {
      return (
        <div className="portfolio-table">
          <div className="no-holdings">
            <p>No portfolio data available</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="portfolio-table">
        <div className="table-header">
          <div className="header-cell">Stock</div>
          <div className="header-cell">Quantity</div>
          <div className="header-cell">Price</div>
          <div className="header-cell">Value</div>
          <div className="header-cell">P&L</div>
          {type === 'historical' && <div className="header-cell">Impact</div>}
        </div>
        
        <div className="table-body">
          {holdings.map((holding, index) => {
            if (!holding) {
              console.warn('📊 Invalid holding at index:', index);
              return null;
            }
            
            return (
              <div key={holding.instrumentKey || index} className="table-row">
                <div className="table-cell stock-cell">
                  <div className="stock-info">
                    <div className="stock-symbol">{holding.symbol || 'N/A'}</div>
                    <div className="stock-name">{holding.companyName || holding.symbol || 'Unknown'}</div>
                  </div>
                </div>
                
                <div className="table-cell quantity-cell">
                  <div className="quantity">{holding.quantity || 0}</div>
                </div>
                
                <div className="table-cell price-cell">
                  <div className="price">
                    {type === 'current' ? (
                      <AnimatedPrice
                        key={`price-${holding.instrumentKey}-${analysisData?.lastUpdated || Date.now()}`}
                        value={holding.currentPrice || 0}
                        previousValue={previousPortfolioValues.holdings?.[holding.instrumentKey]?.currentPrice || holding.currentPrice || 0}
                        currency={true}
                        decimals={2}
                        showArrow={true}
                        showChange={false}
                        size="small"
                      />
                    ) : (
                      <AnimatedPrice
                        key={`historical-price-${holding.instrumentKey}-${analysisData?.lastUpdated || Date.now()}`}
                        value={holding.historicalPrice || 0}
                        previousValue={previousPortfolioValues.historical.holdings?.[holding.instrumentKey]?.historicalPrice || holding.historicalPrice || 0}
                        currency={true}
                        decimals={2}
                        showArrow={true}
                        showChange={false}
                        size="small"
                      />
                    )}
                  </div>
                </div>
                
                <div className="table-cell value-cell">
                  <div className="value">
                    {type === 'current' ? (
                      <AnimatedPrice
                        key={`value-${holding.instrumentKey}-${analysisData?.lastUpdated || Date.now()}`}
                        value={holding.currentValue || 0}
                        previousValue={previousPortfolioValues.holdings?.[holding.instrumentKey]?.currentValue || holding.currentValue || 0}
                        currency={true}
                        decimals={2}
                        showArrow={true}
                        showChange={false}
                        size="small"
                      />
                    ) : (
                      <AnimatedPrice
                        key={`historical-value-${holding.instrumentKey}-${analysisData?.lastUpdated || Date.now()}`}
                        value={holding.historicalValue || 0}
                        previousValue={previousPortfolioValues.historical.holdings?.[holding.instrumentKey]?.historicalValue || holding.historicalValue || 0}
                        currency={true}
                        decimals={2}
                        showArrow={true}
                        showChange={false}
                        size="small"
                      />
                    )}
                  </div>
                </div>
                
                <div className="table-cell pnl-cell">
                  <div className={`pnl ${(type === 'current' ? (holding.profitLoss || 0) : (holding.historicalProfitLoss || 0)) >= 0 ? 'profit' : 'loss'}`}>
                    <div className="pnl-amount">
                      {type === 'current' ? (
                        <AnimatedPrice
                          key={`pnl-${holding.instrumentKey}-${analysisData?.lastUpdated || Date.now()}`}
                          value={holding.profitLoss || 0}
                          previousValue={previousPortfolioValues.holdings?.[holding.instrumentKey]?.profitLoss || holding.profitLoss || 0}
                          currency={true}
                          decimals={2}
                          showArrow={true}
                          showChange={false}
                          size="small"
                        />
                      ) : (
                        <AnimatedPrice
                          key={`historical-pnl-${holding.instrumentKey}-${analysisData?.lastUpdated || Date.now()}`}
                          value={holding.historicalProfitLoss || 0}
                          previousValue={previousPortfolioValues.historical.holdings?.[holding.instrumentKey]?.historicalProfitLoss || holding.historicalProfitLoss || 0}
                          currency={true}
                          decimals={2}
                          showArrow={true}
                          showChange={false}
                          size="small"
                        />
                      )}
                    </div>
                    <div className="pnl-percent">
                      ({formatPercent(type === 'current' ? (holding.profitLossPercent || 0) : (holding.historicalProfitLossPercent || 0))})
                    </div>
                  </div>
                </div>
                
                {type === 'historical' && (
                  <div className="table-cell impact-cell">
                    <div className={`impact ${(holding.impactPercentage || 0) >= 0 ? 'positive' : 'negative'}`}>
                      {formatPercent(holding.impactPercentage || 0)}
                    </div>
                  </div>
                )}
              </div>
            );
          }).filter(Boolean)}
        </div>
      </div>
    );
  });

  if (loading) {
    return (
      <div className="scenario-loading">
        <div className="loading-spinner">
          <RefreshCw className="spin" size={32} />
        </div>
        <p><Trans>Loading historical scenarios...</Trans></p>
      </div>
    );
  }

  return (
    <div className="historical-scenario-analysis">
      <div className="scenario-header">
        <h1>
          <History size={28} />
          <Trans>Portfolio Historical Scenario Analysis</Trans>
        </h1>
        <p><Trans>See how your current portfolio would have performed during major historical market events</Trans></p>
      </div>

      {error && (
        <div className="error-message">
          <AlertTriangle size={20} />
          {error}
          <button onClick={fetchScenarios} className="retry-btn">
            <RefreshCw size={16} />
            <Trans>Retry</Trans>
          </button>
        </div>
      )}

      {!currentPortfolioData || currentPortfolioData?.portfolio?.length === 0 ? (
        <div className="no-portfolio">
          <div className="no-portfolio-icon">
            <BarChart3 size={64} />
          </div>
          <h3><Trans>No Portfolio Data</Trans></h3>
          <p><Trans>You need to have stocks in your portfolio to use historical scenario analysis</Trans></p>
        </div>
      ) : (
        <>
          {/* Scenario Selection */}
          <div className="scenario-selection">
            <h2><Trans>Select a Historical Event</Trans></h2>
            <div className="scenarios-grid">
              {scenarios.map((scenario) => (
                <ScenarioCard key={scenario._id} scenario={scenario} />
              ))}
            </div>
          </div>

          {/* Analysis Results */}
          {analysisData && (
            <PortfolioComparison data={analysisData} />
          )}
        </>
      )}
      
      {/* Info Section */}
      <div className="scenario-info">
        <div className="info-card">
          <Info size={20} />
          <div className="info-content">
            <h4><Trans>How it works</Trans></h4>
            <p>
              <Trans>
                Our AI analyzes historical market data to calculate how each stock and sector performed during major market events. 
                Your current portfolio is then simulated to show exactly how it would have been affected.
              </Trans>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoricalScenarioAnalysis;
