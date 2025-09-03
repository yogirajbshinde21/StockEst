import React, { useState, useEffect, useCallback, useRef } from 'react';
import Trans from './Trans';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart,
  RefreshCw,
  BarChart3,
  LineChart,
  Target,
  Award,
  AlertCircle,
  Calendar,
  Activity,
  Zap,
  Shield,
  Clock
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';
import './PortfolioIntelligence.css';

// Error Boundary Component
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chart Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="chart-error">
          <div className="chart-no-data">
            <div className="no-data-icon">
              <AlertCircle size={48} />
            </div>
            <h3>Chart Error</h3>
            <p>Unable to display chart. Please try refreshing.</p>
            <button onClick={() => this.setState({ hasError: false, error: null })}>
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const PortfolioIntelligence = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');
  const [activeView, setActiveView] = useState('overview');
  const [currentPortfolioData, setCurrentPortfolioData] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  
  // Use socket for real-time updates
  const { portfolioData, isConnected } = useSocket();

  // Fetch current portfolio data to get real-time P&L
  const fetchCurrentPortfolioData = useCallback(async () => {
    try {
      const response = await axios.get('/api/trading/portfolio');
      const portfolioData = response.data?.data;
      if (portfolioData?.summary) {
        const newPortfolioData = {
          totalProfitLoss: portfolioData.summary.totalProfitLoss || 0,
          totalProfitLossPercent: portfolioData.summary.totalProfitLossPercent || 0,
          totalValue: portfolioData.summary.currentValue || 0,
          totalInvested: portfolioData.summary.totalInvested || 0
        };
        
        // Check if data has actually changed
        if (JSON.stringify(newPortfolioData) !== JSON.stringify(currentPortfolioData)) {
          console.log('📊 Portfolio data updated:', newPortfolioData);
          setCurrentPortfolioData(newPortfolioData);
          setLastUpdateTime(Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching current portfolio data:', error);
    }
  }, [currentPortfolioData]);

  // Handle real-time portfolio updates from socket
  useEffect(() => {
    if (portfolioData?.summary && isConnected) {
      const newPortfolioData = {
        totalProfitLoss: portfolioData.summary.totalProfitLoss || 0,
        totalProfitLossPercent: portfolioData.summary.totalProfitLossPercent || 0,
        totalValue: portfolioData.summary.currentValue || 0,
        totalInvested: portfolioData.summary.totalInvested || 0
      };
      
      // Check if data has changed before updating
      if (JSON.stringify(newPortfolioData) !== JSON.stringify(currentPortfolioData)) {
        console.log('🔄 Real-time portfolio data from socket:', newPortfolioData);
        setCurrentPortfolioData(newPortfolioData);
        setLastUpdateTime(Date.now());
      }
    }
  }, [portfolioData, isConnected, currentPortfolioData]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/analytics/dashboard-data?timeframe=${selectedTimeframe}`);
      
      // Validate response data structure
      const responseData = response.data?.data;
      if (!responseData) {
        throw new Error('Invalid response data structure');
      }

      // Ensure timeline is properly formatted
      if (responseData.timeline && Array.isArray(responseData.timeline)) {
        responseData.timeline = responseData.timeline.filter(item => item !== null && item !== undefined);
        
        // Enhance timeline with today's real-time data if available
        if (currentPortfolioData && responseData.timeline.length > 0) {
          console.log('🔄 Enhancing timeline with current portfolio data:', currentPortfolioData);
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          // Check if today's data exists
          const todayDataIndex = responseData.timeline.findIndex(item => {
            if (!item?.date) return false;
            const itemDate = new Date(item.date);
            return itemDate.toISOString().split('T')[0] === todayStr;
          });
          
          console.log('📅 Today string:', todayStr, 'Today data index:', todayDataIndex);
          
          if (todayDataIndex >= 0) {
            // Update today's data with real-time values
            const yesterdayValue = todayDataIndex > 0 ? 
              responseData.timeline[todayDataIndex - 1].totalValue : 
              currentPortfolioData.totalInvested;
            
            const updatedTodayData = {
              ...responseData.timeline[todayDataIndex],
              totalValue: currentPortfolioData.totalValue,
              totalProfitLoss: currentPortfolioData.totalProfitLoss,
              totalProfitLossPercent: currentPortfolioData.totalProfitLossPercent,
              dayChange: currentPortfolioData.totalValue - yesterdayValue,
              dayChangePercent: yesterdayValue > 0 ? 
                ((currentPortfolioData.totalValue - yesterdayValue) / yesterdayValue) * 100 : 0
            };
            
            console.log('📊 Updated today data:', updatedTodayData);
            responseData.timeline[todayDataIndex] = updatedTodayData;
          } else if (currentPortfolioData.totalValue > 0) {
            // Add today's data if not present
            const newTodayData = {
              date: today.toISOString(),
              totalValue: currentPortfolioData.totalValue,
              totalInvested: currentPortfolioData.totalInvested,
              totalProfitLoss: currentPortfolioData.totalProfitLoss,
              totalProfitLossPercent: currentPortfolioData.totalProfitLossPercent,
              dayChange: currentPortfolioData.totalProfitLoss, // Use total P&L as day change for new entries
              dayChangePercent: currentPortfolioData.totalProfitLossPercent
            };
            
            console.log('📊 Adding new today data:', newTodayData);
            responseData.timeline.push(newTodayData);
          }
        }
      }

      setDashboardData(responseData);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedTimeframe, currentPortfolioData]);

  // Fetch current portfolio data first, then dashboard data
  useEffect(() => {
    fetchCurrentPortfolioData();
  }, [fetchCurrentPortfolioData]);

  useEffect(() => {
    if (currentPortfolioData !== null) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, currentPortfolioData]);

  // Set up real-time updates for portfolio data during market hours
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCurrentPortfolioData();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [fetchCurrentPortfolioData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatPercent = (percent) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${(percent || 0).toFixed(2)}%`;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num || 0);
  };

  const timeframes = [
    { value: '7', label: <Trans>7D</Trans> },
    { value: '30', label: <Trans>1M</Trans> },
    { value: '90', label: <Trans>3M</Trans> },
    { value: '180', label: <Trans>6M</Trans> },
    { value: '365', label: <Trans>1Y</Trans> }
  ];

  const views = [
    { value: 'overview', label: <Trans>Overview</Trans>, icon: Activity },
    { value: 'performance', label: <Trans>Performance</Trans>, icon: LineChart },
    { value: 'analytics', label: <Trans>Analytics</Trans>, icon: BarChart3 },
    { value: 'milestones', label: <Trans>Milestones</Trans>, icon: Award }
  ];

  if (loading) {
    return (
      <div className="portfolio-intelligence-loading">
        <div className="loading-spinner">
          <RefreshCw className="spin" size={48} />
        </div>
        <p><Trans>Loading Portfolio Intelligence...</Trans></p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portfolio-intelligence-error">
        <AlertCircle size={48} />
        <h3><Trans>Failed to load portfolio data</Trans></h3>
        <p>{error}</p>
        <button onClick={() => {
          fetchCurrentPortfolioData();
          fetchDashboardData();
        }} className="retry-btn">
          <RefreshCw size={16} />
          <Trans>Try Again</Trans>
        </button>
      </div>
    );
  }

  // Safely extract data with fallbacks
  const timeline = dashboardData?.timeline || [];
  const analytics = dashboardData?.analytics || {};
  const milestones = dashboardData?.milestones || [];

  return (
    <div className="portfolio-intelligence">
      {/* Header */}
      <div className="intelligence-header">
        <div className="header-content">
          <h1 className="intelligence-title">
            <Zap className="title-icon" />
            <Trans>Portfolio Intelligence Dashboard</Trans>
          </h1>
          <p className="intelligence-subtitle">
            <Trans>Advanced analytics and insights for your investment journey</Trans>
          </p>
        </div>
        
        <div className="header-controls">
          <div className="timeframe-selector">
            {timeframes.map(tf => (
              <button
                key={tf.value}
                className={`timeframe-btn ${selectedTimeframe === tf.value ? 'active' : ''}`}
                onClick={() => setSelectedTimeframe(tf.value)}
              >
                {tf.label}
              </button>
            ))}
          </div>
          
          <button onClick={() => {
            fetchCurrentPortfolioData();
            fetchDashboardData();
          }} className="refresh-btn" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <Trans>Refresh</Trans>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="intelligence-nav">
        {views.map(view => {
          const IconComponent = view.icon;
          return (
            <button
              key={view.value}
              className={`nav-btn ${activeView === view.value ? 'active' : ''}`}
              onClick={() => setActiveView(view.value)}
            >
              <IconComponent size={18} />
              {view.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="intelligence-content">
        {activeView === 'overview' && (
          <OverviewSection 
            analytics={analytics} 
            timeline={timeline} 
            timeframe={selectedTimeframe}
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
            lastUpdateTime={lastUpdateTime}
          />
        )}
        
        {activeView === 'performance' && (
          <PerformanceSection 
            timeline={timeline} 
            analytics={analytics}
            timeframe={selectedTimeframe}
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
            lastUpdateTime={lastUpdateTime}
          />
        )}
        
        {activeView === 'analytics' && (
          <AnalyticsSection 
            analytics={analytics}
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
            formatNumber={formatNumber}
          />
        )}
        
        {activeView === 'milestones' && (
          <MilestonesSection 
            milestones={milestones}
            analytics={analytics}
            formatCurrency={formatCurrency}
          />
        )}
      </div>
    </div>
  );
};

// Overview Section Component
const OverviewSection = ({ analytics, timeline, timeframe, formatCurrency, formatPercent, lastUpdateTime }) => {
  // Safely extract values with proper fallbacks
  const safeTimeline = Array.isArray(timeline) ? timeline.filter(item => item && typeof item === 'object') : [];
  const lastEntry = safeTimeline.length > 0 ? safeTimeline[safeTimeline.length - 1] : {};
  
  const currentValue = typeof lastEntry.totalValue === 'number' ? lastEntry.totalValue : 0;
  const invested = typeof lastEntry.totalInvested === 'number' ? lastEntry.totalInvested : 0;
  const profitLoss = currentValue - invested;
  const profitLossPercent = invested > 0 ? (profitLoss / invested) * 100 : 0;

  return (
    <div className="overview-section">
      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card portfolio-value">
          <div className="metric-icon">
            <PieChart size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{formatCurrency(currentValue)}</div>
            <div className="metric-label">Portfolio Value</div>
            <div className={`metric-change ${profitLoss >= 0 ? 'positive' : 'negative'}`}>
              {profitLoss >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {formatPercent(profitLossPercent)}
            </div>
          </div>
        </div>

        <div className="metric-card total-returns">
          <div className="metric-icon">
            <TrendingUp size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{formatCurrency(profitLoss)}</div>
            <div className="metric-label">Total Returns</div>
            <div className="metric-subtitle">
              {formatPercent(analytics?.returns?.[timeframe === '7' ? 'oneWeek' : 
                                                   timeframe === '30' ? 'oneMonth' :
                                                   timeframe === '90' ? 'threeMonths' :
                                                   timeframe === '180' ? 'sixMonths' : 'oneYear'] || 0)} this period
            </div>
          </div>
        </div>

        <div className="metric-card volatility">
          <div className="metric-icon">
            <BarChart3 size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{formatPercent(analytics?.performance?.volatility)}</div>
            <div className="metric-label">Volatility</div>
            <div className="metric-subtitle">Risk measure</div>
          </div>
        </div>

        <div className="metric-card sharpe-ratio">
          <div className="metric-icon">
            <Shield size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{(analytics?.performance?.sharpeRatio || 0).toFixed(2)}</div>
            <div className="metric-label">Sharpe Ratio</div>
            <div className="metric-subtitle">Risk-adjusted return</div>
          </div>
        </div>
      </div>

      {/* Portfolio Timeline Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>Portfolio Performance Timeline</h3>
          <div className="chart-legend">
            <div className="legend-item">
              <div className="legend-color portfolio-line"></div>
              <span>Portfolio Value</span>
            </div>
            <div className="legend-item">
              <div className="legend-color invested-line"></div>
              <span>Total Invested</span>
            </div>
          </div>
        </div>
        <ChartErrorBoundary>
          <PortfolioTimelineChart 
            timeline={timeline} 
            formatCurrency={formatCurrency}
            lastUpdateTime={lastUpdateTime}
          />
        </ChartErrorBoundary>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-item">
          <div className="stat-icon best-day">
            <Calendar size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {formatPercent(analytics?.performance?.bestDay?.percent)}
            </div>
            <div className="stat-label">Best Day</div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon worst-day">
            <Calendar size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {formatPercent(analytics?.performance?.worstDay?.percent)}
            </div>
            <div className="stat-label">Worst Day</div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon max-drawdown">
            <TrendingDown size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {formatPercent(analytics?.performance?.maxDrawdown)}
            </div>
            <div className="stat-label">Max Drawdown</div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon diversification">
            <PieChart size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {(analytics?.riskMetrics?.diversificationScore || 0).toFixed(0)}
            </div>
            <div className="stat-label">Diversification Score</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Performance Section Component
const PerformanceSection = ({ timeline, analytics, timeframe, formatCurrency, formatPercent, lastUpdateTime }) => {
  return (
    <div className="performance-section">
      {/* Returns Comparison */}
      <div className="returns-grid">
        <div className="returns-card">
          <h3>Returns Comparison</h3>
          <div className="returns-bars">
            {Object.entries(analytics?.returns || {}).map(([period, value]) => (
              <div key={period} className="return-bar-item">
                <div className="return-period">
                  {period === 'oneDay' ? '1D' :
                   period === 'oneWeek' ? '1W' :
                   period === 'oneMonth' ? '1M' :
                   period === 'threeMonths' ? '3M' :
                   period === 'sixMonths' ? '6M' :
                   period === 'oneYear' ? '1Y' : 'All'}
                </div>
                <div className="return-bar-container">
                  <div 
                    className={`return-bar ${value >= 0 ? 'positive' : 'negative'}`}
                    style={{
                      width: `${Math.min(Math.abs(value || 0), 100)}%`,
                      minWidth: '2px'
                    }}
                  ></div>
                </div>
                <div className={`return-value ${value >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercent(value)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="performance-metrics-card">
          <h3>Performance Metrics</h3>
          <div className="metrics-list">
            <div className="metric-row">
              <span className="metric-name">Total Return</span>
              <span className={`metric-value ${(analytics?.performance?.totalReturn || 0) >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(analytics?.performance?.totalReturn)}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-name">Annualized Return</span>
              <span className="metric-value">
                {formatPercent(analytics?.performance?.annualizedReturn)}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-name">Volatility</span>
              <span className="metric-value">
                {formatPercent(analytics?.performance?.volatility)}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-name">Sharpe Ratio</span>
              <span className="metric-value">
                {(analytics?.performance?.sharpeRatio || 0).toFixed(2)}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-name">Max Drawdown</span>
              <span className="metric-value negative">
                {formatPercent(analytics?.performance?.maxDrawdown)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="performers-grid">
        <div className="performers-card gainers">
          <h3>
            <TrendingUp size={20} />
            Top Gainers
          </h3>
          {analytics?.topGainers?.length > 0 ? (
            <div className="performers-list">
              {analytics.topGainers.map((stock, index) => (
                <div key={index} className="performer-item">
                  <div className="performer-info">
                    <span className="performer-symbol">{stock.symbol}</span>
                    <span className="performer-value">{formatCurrency(stock.currentValue)}</span>
                  </div>
                  <div className="performer-gains positive">
                    <span>{formatCurrency(stock.profitLoss)}</span>
                    <span>({formatPercent(stock.profitLossPercent)})</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No gainers yet</div>
          )}
        </div>

        <div className="performers-card losers">
          <h3>
            <TrendingDown size={20} />
            Top Losers
          </h3>
          {analytics?.topLosers?.length > 0 ? (
            <div className="performers-list">
              {analytics.topLosers.map((stock, index) => (
                <div key={index} className="performer-item">
                  <div className="performer-info">
                    <span className="performer-symbol">{stock.symbol}</span>
                    <span className="performer-value">{formatCurrency(stock.currentValue)}</span>
                  </div>
                  <div className="performer-gains negative">
                    <span>{formatCurrency(stock.profitLoss)}</span>
                    <span>({formatPercent(stock.profitLossPercent)})</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No losers yet</div>
          )}
        </div>
      </div>

      {/* Performance Timeline Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>Daily Performance Timeline</h3>
        </div>
        <DailyPerformanceChart 
          timeline={timeline} 
          formatCurrency={formatCurrency}
          formatPercent={formatPercent}
          lastUpdateTime={lastUpdateTime}
        />
      </div>
    </div>
  );
};

// Analytics Section Component
const AnalyticsSection = ({ analytics, formatCurrency, formatPercent, formatNumber }) => {
  return (
    <div className="analytics-section">
      {/* Sector Performance */}
      <div className="sector-analysis-card">
        <h3>Sector Performance Analysis</h3>
        {analytics?.sectorPerformance?.length > 0 ? (
          <div className="sector-chart">
            {analytics.sectorPerformance.map((sector, index) => (
              <div key={index} className="sector-item">
                <div className="sector-info">
                  <span className="sector-name">{sector.sector}</span>
                  <span className="sector-allocation">{formatPercent(sector.allocation)}</span>
                </div>
                <div className="sector-bar-container">
                  <div 
                    className="sector-bar"
                    style={{ width: `${sector.allocation}%` }}
                  ></div>
                </div>
                <div className={`sector-performance ${sector.profitLoss >= 0 ? 'positive' : 'negative'}`}>
                  <span>{formatCurrency(sector.profitLoss)}</span>
                  <span>({formatPercent(sector.profitLossPercent)})</span>
                </div>
                <div className="sector-top-stock">
                  Top: {sector.topStock}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">No sector data available</div>
        )}
      </div>

      {/* Risk Metrics */}
      <div className="risk-metrics-grid">
        <div className="risk-card concentration">
          <div className="risk-icon">
            <Target size={24} />
          </div>
          <div className="risk-content">
            <div className="risk-value">
              {formatPercent((analytics?.riskMetrics?.portfolioConcentration || 0) * 100)}
            </div>
            <div className="risk-label">Portfolio Concentration</div>
            <div className="risk-description">
              Lower is better for diversification
            </div>
          </div>
        </div>

        <div className="risk-card diversification">
          <div className="risk-icon">
            <PieChart size={24} />
          </div>
          <div className="risk-content">
            <div className="risk-value">
              {(analytics?.riskMetrics?.diversificationScore || 0).toFixed(0)}
            </div>
            <div className="risk-label">Diversification Score</div>
            <div className="risk-description">
              Out of 100, higher is better
            </div>
          </div>
        </div>

        <div className="risk-card holding-period">
          <div className="risk-icon">
            <Clock size={24} />
          </div>
          <div className="risk-content">
            <div className="risk-value">
              {(analytics?.riskMetrics?.avgHoldingPeriod || 0).toFixed(0)} days
            </div>
            <div className="risk-label">Avg Holding Period</div>
            <div className="risk-description">
              Average time you hold stocks
            </div>
          </div>
        </div>

        <div className="risk-card turnover">
          <div className="risk-icon">
            <RefreshCw size={24} />
          </div>
          <div className="risk-content">
            <div className="risk-value">
              {(analytics?.riskMetrics?.turnoverRatio || 0).toFixed(2)}
            </div>
            <div className="risk-label">Turnover Ratio</div>
            <div className="risk-description">
              Trading frequency indicator
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>Portfolio Composition Analysis</h3>
        </div>
        <PortfolioCompositionChart 
          sectorData={analytics?.sectorPerformance || []}
          formatPercent={formatPercent}
        />
      </div>
    </div>
  );
};

// Milestones Section Component
const MilestonesSection = ({ milestones, analytics, formatCurrency }) => {
  return (
    <div className="milestones-section">
      <div className="milestones-header">
        <h3>
          <Award size={24} />
          Achievement Milestones
        </h3>
        <p>Track your investment journey with key performance milestones</p>
      </div>

      {milestones?.length > 0 ? (
        <div className="milestones-list">
          {milestones.map((milestone, index) => (
            <div key={index} className="milestone-card">
              <div className="milestone-icon">
                <Award size={24} />
              </div>
              <div className="milestone-content">
                <div className="milestone-title">{milestone.description}</div>
                <div className="milestone-value">{formatCurrency(milestone.value)}</div>
                <div className="milestone-date">
                  Achieved on {new Date(milestone.achievedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="milestone-badge">
                <span>#{index + 1}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-milestones">
          <Target size={48} />
          <h3>No milestones yet</h3>
          <p>Start trading to unlock achievement milestones</p>
        </div>
      )}

      {/* Progress Indicators */}
      <div className="milestone-progress">
        <h4>Next Milestones</h4>
        <div className="progress-items">
          <ProgressItem 
            title="First ₹1,000 Profit" 
            current={analytics?.performance?.totalReturn || 0}
            target={1000}
            formatCurrency={formatCurrency}
          />
          <ProgressItem 
            title="Portfolio Value ₹1,00,000" 
            current={analytics?.performance?.totalReturn || 0}
            target={100000}
            formatCurrency={formatCurrency}
          />
          <ProgressItem 
            title="5 Stock Diversification" 
            current={analytics?.topGainers?.length || 0}
            target={5}
            isCount={true}
          />
        </div>
      </div>
    </div>
  );
};

// Progress Item Component
const ProgressItem = ({ title, current, target, formatCurrency, isCount = false }) => {
  const progress = Math.min((current / target) * 100, 100);
  const isCompleted = current >= target;

  return (
    <div className={`progress-item ${isCompleted ? 'completed' : ''}`}>
      <div className="progress-header">
        <span className="progress-title">{title}</span>
        <span className="progress-value">
          {isCount ? `${current}/${target}` : `${formatCurrency(current)} / ${formatCurrency(target)}`}
        </span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="progress-percentage">{progress.toFixed(1)}%</div>
    </div>
  );
};

// Portfolio Timeline Chart Component - Enhanced with 30-day view and real-time capabilities
// 🎯 Features:
// - 30-day rolling window (same as Daily Performance Timeline)
// - Real-time portfolio value updates
// - Zero-fill for missing days (no sample data)
// - Day transition support (today → yesterday → new today)
// - Stable data management to prevent re-renders
const PortfolioTimelineChart = ({ timeline, formatCurrency, lastUpdateTime }) => {
  console.log('📈 PortfolioTimelineChart received timeline:', timeline, 'lastUpdateTime:', lastUpdateTime);
  
  // Use useMemo to prevent unnecessary re-computations and re-renders
  const chartData = React.useMemo(() => {
    // Generate real data for exactly 30 days - always ending with TODAY
    const today = new Date();
    const realPortfolioData = [];
    
    // Normalize timeline dates for accurate comparison
    const timelineMap = new Map();
    if (Array.isArray(timeline)) {
      timeline.forEach(item => {
        if (item && item.date) {
          const normalizedDate = new Date(item.date).toDateString();
          timelineMap.set(normalizedDate, item);
        }
      });
    }
    
    // Generate 30 days worth of data, ending with today
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0); // Normalize to start of day
      
      const normalizedDate = date.toDateString();
      const timelineMatch = timelineMap.get(normalizedDate);
      const isToday = i === 0;
      
      let portfolioValue = 0;
      let totalInvested = 0;
      let totalProfitLoss = 0;
      
      if (timelineMatch) {
        // Use real data when available
        portfolioValue = timelineMatch.totalValue || 0;
        totalInvested = timelineMatch.totalInvested || 0;
        totalProfitLoss = timelineMatch.totalProfitLoss || (portfolioValue - totalInvested);
      } else {
        // Zero-fill for missing days (showing 0 for both portfolio and invested)
        portfolioValue = 0;
        totalInvested = 0;
        totalProfitLoss = 0;
      }
      
      realPortfolioData.push({
        date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        fullDate: date.toISOString(),
        portfolioValue: portfolioValue,
        totalInvested: totalInvested,
        profitLoss: totalProfitLoss,
        isReal: !!timelineMatch, // Mark if this is real data or zero fill
        isToday: isToday, // Mark today's data for animation purposes
        dateKey: date.getTime() // Unique key for day transition detection
      });
    }
    
    console.log('📈 Generated portfolio timeline data (30 days):', realPortfolioData);
    return { data: realPortfolioData, isSample: false, realDataCount: timeline?.length || 0 };
  }, [timeline]);

  return (
    <PortfolioTimelineChartRender 
      timeline={chartData.data} 
      formatCurrency={formatCurrency} 
      isSample={chartData.isSample}
      realDataCount={chartData.realDataCount || 0}
      lastUpdateTime={lastUpdateTime}
    />
  );
};

// Recharts-based portfolio timeline chart rendering component - Enhanced for real-time updates
// 🎯 Solution: Prevents page refresh/re-render by:
// 1. Using stable keys for Recharts components
// 2. Minimal state updates with short delays for CSS transitions
// 3. Real-time portfolio value animations
// 4. 30-day view with zero-fill for missing days
const PortfolioTimelineChartRender = ({ timeline, formatCurrency, isSample = false, realDataCount = 0, lastUpdateTime }) => {
  // Transform data for Recharts with stable structure
  const chartData = timeline.map(d => ({
    date: d.date,
    portfolioValue: d.portfolioValue || 0,
    totalInvested: d.totalInvested || 0,
    profitLoss: d.profitLoss || 0,
    isReal: d.isReal,
    isToday: d.isToday
  }));

  // Enhanced tooltip for portfolio timeline
  const PortfolioTimelineTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip portfolio-timeline-tooltip">
          <div className="tooltip-label">{label}</div>
          <div className="tooltip-content">
            <div className="tooltip-item">
              <span className="tooltip-indicator portfolio">📈</span>
              <span className="tooltip-amount">{formatCurrency(data.portfolioValue)}</span>
              <span className="tooltip-subtitle">Portfolio Value</span>
            </div>
            <div className="tooltip-item">
              <span className="tooltip-indicator invested">💰</span>
              <span className="tooltip-amount">{formatCurrency(data.totalInvested)}</span>
              <span className="tooltip-subtitle">Total Invested</span>
            </div>
            <div className="tooltip-item">
              <span className={`tooltip-indicator ${data.profitLoss >= 0 ? 'positive' : 'negative'}`}>
                {data.profitLoss >= 0 ? '↗' : '↘'}
              </span>
              <span className="tooltip-amount">{formatCurrency(data.profitLoss)}</span>
              <span className="tooltip-subtitle">Total Return</span>
            </div>
            {data.isToday && (
              <div className="tooltip-live-indicator">
                <span className="live-dot-small"></span>
                <span>Live Data</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Format Y-axis values
  const formatYAxis = (value) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(0)}K`;
    }
    return `₹${value}`;
  };

  return (
    <div className={`timeline-chart portfolio-timeline-chart ${isSample ? 'sample-chart' : ''}`}>
      {/* Real-time data indicator */}
      {!isSample && realDataCount > 0 && (
        <div className="real-time-indicator">
          <span className="live-dot"></span>
          <span className="live-text">Live Portfolio Data</span>
          <span className="data-points">({realDataCount} real data points)</span>
        </div>
      )}
      
      {isSample && (
        <div className="sample-indicator">
          {realDataCount === 1 ? (
            <span>📊 Today's Data + 30-day Historical View - Portfolio timeline will grow with daily data</span>
          ) : (
            <span>📊 Sample Portfolio Data - This shows how your chart will look with real trading data</span>
          )}
        </div>
      )}
      
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={400}>
          <RechartsLineChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={Math.floor(chartData.length / 6)}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={formatYAxis}
              width={80}
            />
            <Tooltip content={<PortfolioTimelineTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="portfolioValue"
              stroke="#667eea"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, stroke: '#667eea', strokeWidth: 2 }}
              name="Portfolio Value"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="totalInvested"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 5, stroke: '#f59e0b', strokeWidth: 2 }}
              name="Total Invested"
              connectNulls={false}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Enhanced Performance Summary */}
      <div className="chart-info portfolio-timeline-info">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Latest Portfolio Value:</span>
            <span className="info-value">
              {formatCurrency(chartData[chartData.length - 1]?.portfolioValue || 0)}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Total Invested:</span>
            <span className="info-value">
              {formatCurrency(chartData[chartData.length - 1]?.totalInvested || 0)}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Total Return:</span>
            <span className={`info-value ${(chartData[chartData.length - 1]?.profitLoss || 0) >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(chartData[chartData.length - 1]?.profitLoss || 0)} 
              ({(((chartData[chartData.length - 1]?.profitLoss || 0) / (chartData[chartData.length - 1]?.totalInvested || 1)) * 100).toFixed(2)}%)
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">30-Day View:</span>
            <span className="info-value positive">
              {realDataCount > 0 ? `${realDataCount} real data points` : 'Zero-fill'} + 30-day timeline
            </span>
          </div>
        </div>
        
        {realDataCount > 0 && !isSample && (
          <div className="real-time-status">
            <div className="status-indicator">
              <span className="live-dot-small"></span>
              <span className="status-text">Real-time portfolio tracking active</span>
            </div>
            {lastUpdateTime && (
              <div className="last-update">
                Last update: {new Date(lastUpdateTime).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
        
        {isSample && (
          <div className="info-item">
            <span className="info-label">📊 Chart Status:</span>
            <span className="info-value positive">
              {realDataCount === 1 ? 'Real data collection started today!' : 'Real-time chart ready with zero-fill data'}
            </span>
          </div>
        )}
        {realDataCount === 1 && (
          <div className="info-item">
            <span className="info-label">📅 Data Collection:</span>
            <span className="info-value">Portfolio timeline will accumulate daily snapshots</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Daily Performance Chart Component - Shows daily P&L patterns with real-time animations
// ✨ Features:
// - Real-time data integration via socket connection
// - Smooth bar animations when P&L values change
// - Visual indicators for live data and update status
// - Enhanced animations for today's P&L changes (longer duration)
// - Cubic ease-out animations for natural movement
// 📅 Day Transition Support:
// - Today's bar is always the LAST bar (rightmost)
// - When a new day starts, yesterday moves to second-last position
// - New today's bar appears as the last bar with fresh data
// - Animation continues to work for the new "today" bar
// - Chart automatically shifts to maintain 30-day window
const DailyPerformanceChart = ({ timeline, formatCurrency, formatPercent, lastUpdateTime }) => {
  console.log('📈 DailyPerformanceChart received timeline:', timeline, 'lastUpdateTime:', lastUpdateTime);
  
  // Use useMemo to prevent unnecessary re-computations and re-renders
  const chartData = React.useMemo(() => {
    // Generate real data for exactly 30 days - always ending with TODAY
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for consistent comparison
    const realDailyData = [];
    
    console.log('📅 Generating chart data for date:', today.toDateString());
    
    // Create 30 days of data structure
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Find matching timeline data for this date
      const timelineMatch = timeline?.find(item => {
        if (!item?.date) return false;
        const itemDate = new Date(item.date);
        itemDate.setHours(0, 0, 0, 0); // Normalize for comparison
        return itemDate.getTime() === date.getTime();
      });
      
      let dayChange = 0;
      let dayChangePercent = 0;
      const isToday = i === 0; // Last item is always today
      
      if (timelineMatch) {
        // For today (last entry), use total P&L if dayChange is 0
        if (isToday && timelineMatch.dayChange === 0 && timelineMatch.totalProfitLoss !== undefined) {
          // Use total P&L as today's change since market started
          dayChange = timelineMatch.totalProfitLoss;
          dayChangePercent = timelineMatch.totalProfitLossPercent || 0;
          console.log('📊 Using total P&L for today:', { dayChange, dayChangePercent });
        } else {
          dayChange = timelineMatch.dayChange || 0;
          dayChangePercent = timelineMatch.dayChangePercent || 0;
        }
      }
      
      realDailyData.push({
        date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        fullDate: date.toISOString(),
        dayChange: dayChange,
        dayChangePercent: dayChangePercent,
        isPositive: dayChange >= 0,
        portfolioValue: timelineMatch?.totalValue || 0,
        isReal: !!timelineMatch, // Mark if this is real data or zero fill
        isToday: isToday, // Mark today's bar for animation purposes
        dateKey: date.getTime() // Unique key for day transition detection
      });
    }
    
    console.log('📈 Generated daily chart data:', realDailyData);
    return { data: realDailyData, isSample: false, realDataCount: timeline?.length || 0 };
  }, [timeline]);

  return (
    <DailyPerformanceChartRender 
      timeline={chartData.data} 
      formatCurrency={formatCurrency} 
      formatPercent={formatPercent} 
      isSample={chartData.isSample}
      realDataCount={chartData.realDataCount || 0}
      lastUpdateTime={lastUpdateTime}
    />
  );
};

// Recharts-based daily performance chart rendering component - Stable animation approach
// 🎯 Solution: Prevents page refresh/re-render by:
// 1. Using stable keys for Recharts components
// 2. Minimal state updates with short delays for CSS transitions
// 3. CSS-based animations instead of JavaScript-driven re-renders
// 4. Smart change detection to only animate significant updates
const DailyPerformanceChartRender = ({ timeline, formatCurrency, formatPercent, isSample = false, realDataCount = 0, lastUpdateTime }) => {
  const [displayData, setDisplayData] = useState(timeline || []);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousDataRef = useRef(timeline || []);
  
  // Handle data updates with minimal re-renders and day transition support
  useEffect(() => {
    if (!timeline || timeline.length === 0) {
      setDisplayData([]);
      return;
    }
    
    // Check if this is the initial load
    if (previousDataRef.current.length === 0) {
      setDisplayData(timeline);
      previousDataRef.current = timeline;
      console.log('📊 Initial chart data loaded');
      return;
    }
    
    // Find today's bar (marked with isToday: true) in both current and previous data
    const currentTodayIndex = timeline.findIndex(item => item.isToday === true);
    const previousTodayIndex = previousDataRef.current.findIndex(item => item.isToday === true);
    
    if (currentTodayIndex === -1 || previousTodayIndex === -1) {
      // Fallback to last item if isToday flag is missing
      const currentToday = timeline[timeline.length - 1];
      const previousToday = previousDataRef.current[previousDataRef.current.length - 1];
      
      const hasSignificantChange = currentToday && previousToday && 
        Math.abs(currentToday.dayChangePercent - previousToday.dayChangePercent) > 0.01;
      
      if (hasSignificantChange) {
        console.log('📊 Smooth updating chart data (fallback method):', 
          `${previousToday.dayChangePercent.toFixed(2)}% → ${currentToday.dayChangePercent.toFixed(2)}%`);
        setIsAnimating(true);
        setTimeout(() => {
          setDisplayData(timeline);
          setIsAnimating(false);
          previousDataRef.current = timeline;
        }, 100);
      } else {
        setDisplayData(timeline);
        previousDataRef.current = timeline;
      }
      return;
    }
    
    // Get today's data from both arrays
    const currentToday = timeline[currentTodayIndex];
    const previousToday = previousDataRef.current[previousTodayIndex];
    
    // Check for day transition (when today's date changes)
    const dayTransition = currentToday.dateKey !== previousToday.dateKey;
    
    if (dayTransition) {
      console.log('📅 Day transition detected! New day started:', {
        previousDate: new Date(previousToday.dateKey).toDateString(),
        currentDate: new Date(currentToday.dateKey).toDateString()
      });
      
      // On day transition, update immediately with animation
      setIsAnimating(true);
      setTimeout(() => {
        setDisplayData(timeline);
        setIsAnimating(false);
        previousDataRef.current = timeline;
        console.log('📊 Chart updated for new day - yesterday is now second-last, today is last bar');
      }, 150); // Slightly longer delay for day transition
      return;
    }
    
    // Regular intraday updates - check for significant P&L changes
    const hasSignificantChange = Math.abs(currentToday.dayChangePercent - previousToday.dayChangePercent) > 0.01;
    
    if (hasSignificantChange) {
      console.log('📊 Today\'s P&L changed, animating update:', 
        `${previousToday.dayChangePercent.toFixed(2)}% → ${currentToday.dayChangePercent.toFixed(2)}%`);
      
      setIsAnimating(true);
      setTimeout(() => {
        setDisplayData(timeline);
        setIsAnimating(false);
        previousDataRef.current = timeline;
        console.log('📊 Intraday P&L animation completed');
      }, 100);
    } else {
      // Minor updates - no animation needed
      setDisplayData(timeline);
      previousDataRef.current = timeline;
    }
  }, [timeline, lastUpdateTime]);
  
  // Transform data for Recharts
  const chartData = displayData.map(d => ({
    date: d.date,
    dayChange: d.dayChange || 0,
    dayChangePercent: d.dayChangePercent || 0,
    isPositive: (d.dayChange || 0) >= 0,
    fill: (d.dayChange || 0) >= 0 ? '#10b981' : '#ef4444',
    isReal: d.isReal || false,
    isToday: d.isToday || false, // Pass through today marker
    dateKey: d.dateKey // Pass through date key for debugging
  }));
  
  // Calculate performance statistics from current chart data
  const totalDays = chartData.length;
  const profitDays = chartData.filter(d => d.isPositive).length;
  const lossDays = totalDays - profitDays;
  const bestDay = chartData.length > 0 ? Math.max(...chartData.map(d => d.dayChangePercent)) : 0;
  const worstDay = chartData.length > 0 ? Math.min(...chartData.map(d => d.dayChangePercent)) : 0;
  const avgDaily = chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.dayChangePercent, 0) / totalDays : 0;
  const winRate = totalDays > 0 ? (profitDays / totalDays) * 100 : 0;

  // Custom tooltip for daily performance
  const DailyPerformanceTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip daily-performance-tooltip">
          <div className="tooltip-label">{label}</div>
          <div className="tooltip-content">
            <div className="tooltip-item">
              <span className={`tooltip-indicator ${data.isPositive ? 'positive' : 'negative'}`}>
                {data.isPositive ? '↗' : '↘'}
              </span>
              <span className="tooltip-amount">{formatCurrency(data.dayChange)}</span>
            </div>
            <div className="tooltip-item">
              <span className={`tooltip-percent ${data.isPositive ? 'positive' : 'negative'}`}>
                {formatPercent(data.dayChangePercent)}
              </span>
            </div>
            {data.isReal && (
              <div className="tooltip-item">
                <span className="real-data-indicator">📊 Real Data</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Format Y-axis for percentage values
  const formatYAxisPercent = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <div className={`daily-performance-chart ${isSample ? 'sample-chart' : ''} ${isAnimating ? 'animating' : ''}`}>
      {isSample && (
        <div className="sample-indicator">
          {realDataCount === 1 ? (
            <span>📊 Today's Performance + Historical Pattern - Daily bars will accumulate from tomorrow</span>
          ) : (
            <span>📊 Sample Daily Performance Data - Shows profit/loss patterns per day</span>
          )}
        </div>
      )}
      
      <div className="chart-header">
        <div className="chart-title-section">
          <h4>Daily Profit & Loss Pattern</h4>
          {!isSample && (
            <div className="real-time-indicator">
              <span className="live-dot"></span>
              <span className="live-text">Live</span>
            </div>
          )}
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color positive"></div>
            <span>Profit Days ({profitDays})</span>
          </div>
          <div className="legend-item">
            <div className="legend-color negative"></div>
            <span>Loss Days ({lossDays})</span>
          </div>
          <div className="legend-item">
            <span>Win Rate: {winRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>
      
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={500}>
          <BarChart
            key="daily-performance-chart" // Stable key to prevent unnecessary re-mounts
            data={chartData}
            margin={{
              top: 30,
              right: 40,
              left: 30,
              bottom: 80,
            }}
            barCategoryGap="15%"
            maxBarSize={30}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.6} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={formatYAxisPercent}
              width={70}
              domain={['dataMin - 0.2', 'dataMax + 0.2']}
            />
            <Tooltip content={<DailyPerformanceTooltip />} />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" strokeWidth={1} />
            <Bar
              dataKey="dayChangePercent"
              fill="#8884d8"
              radius={[3, 3, 0, 0]}
              stroke="#ffffff"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Performance Statistics */}
      <div className="performance-stats">
        <div className="performance-summary">
          <div className="performance-title">
            📊 Today's Performance + Historical Pattern
          </div>
          <div className="performance-subtitle">Daily Profit & Loss Pattern</div>
          
          <div className="performance-overview">
            <div className="overview-item">
              <div className="overview-label">Profit Days</div>
              <div className="overview-value positive">{profitDays}</div>
            </div>
            <div className="overview-item">
              <div className="overview-label">Loss Days</div>
              <div className="overview-value negative">{lossDays}</div>
            </div>
            <div className="overview-item">
              <div className="overview-label">Win Rate</div>
              <div className="overview-value">{winRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <div className="performance-metrics">
          <div className="stat-group">
            <div className="stat-item">
              <span className="stat-label">Best Day:</span>
              <span className="stat-value positive">
                {formatPercent(bestDay)} ({formatCurrency(chartData.find(d => d.dayChangePercent === bestDay)?.dayChange || 0)})
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Worst Day:</span>
              <span className="stat-value negative">
                {formatPercent(worstDay)} ({formatCurrency(chartData.find(d => d.dayChangePercent === worstDay)?.dayChange || 0)})
              </span>
            </div>
          </div>
          
          <div className="stat-group">
            <div className="stat-item">
              <span className="stat-label">Avg Daily:</span>
              <span className={`stat-value ${avgDaily >= 0 ? 'positive' : 'negative'}`}>
                {formatPercent(avgDaily)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Volatility:</span>
              <span className="stat-value">
                {formatPercent(Math.sqrt(chartData.reduce((sum, d) => sum + Math.pow(d.dayChangePercent - avgDaily, 2), 0) / totalDays))}
              </span>
            </div>
          </div>
        </div>
        
        {isSample && (
          <div className="data-status-section">
            <div className="data-status-title">
              📅 Data Status: Daily tracking {realDataCount === 1 ? 'started' : 'will begin tomorrow'}
            </div>
            {realDataCount === 0 && (
              <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#6b7280' }}>
                Daily bars will accumulate from tomorrow
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Portfolio Composition Chart Component
const PortfolioCompositionChart = ({ sectorData, formatPercent }) => {
  if (!sectorData || sectorData.length === 0) {
    return <div className="chart-no-data">No composition data available</div>;
  }

  const colors = ['#667eea', '#f59e0b', '#10b981', '#f87171', '#8b5cf6', '#06b6d4'];

  return (
    <div className="composition-chart">
      <div className="pie-chart">
        <svg viewBox="0 0 200 200" className="pie-svg">
          {sectorData.map((sector, index) => {
            const startAngle = sectorData.slice(0, index).reduce((sum, s) => sum + (s.allocation * 3.6), 0);
            const endAngle = startAngle + (sector.allocation * 3.6);
            const largeArcFlag = sector.allocation > 50 ? 1 : 0;
            
            const x1 = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
            const y1 = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
            const x2 = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
            const y2 = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);
            
            return (
              <path
                key={index}
                d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                fill={colors[index % colors.length]}
                className="pie-slice"
              />
            );
          })}
        </svg>
      </div>
      
      <div className="composition-legend">
        {sectorData.map((sector, index) => (
          <div key={index} className="legend-item">
            <div 
              className="legend-color"
              style={{ backgroundColor: colors[index % colors.length] }}
            ></div>
            <span className="legend-label">{sector.sector}</span>
            <span className="legend-value">{formatPercent(sector.allocation)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioIntelligence;
