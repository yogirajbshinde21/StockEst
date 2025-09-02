import React, { useState, useEffect, useCallback } from 'react';
import Trans from './Trans';
import axios from 'axios';
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
      }

      setDashboardData(responseData);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedTimeframe]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
        <button onClick={fetchDashboardData} className="retry-btn">
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
          
          <button onClick={fetchDashboardData} className="refresh-btn" disabled={loading}>
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
          />
        )}
        
        {activeView === 'performance' && (
          <PerformanceSection 
            timeline={timeline} 
            analytics={analytics}
            timeframe={selectedTimeframe}
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
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
const OverviewSection = ({ analytics, timeline, timeframe, formatCurrency, formatPercent }) => {
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
const PerformanceSection = ({ timeline, analytics, timeframe, formatCurrency, formatPercent }) => {
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

// Portfolio Timeline Chart Component
const PortfolioTimelineChart = ({ timeline, formatCurrency }) => {
  console.log('PortfolioTimelineChart received timeline:', timeline);
  
  // Early return for missing data
  if (!timeline) {
    console.log('No timeline data provided');
    return <PortfolioTimelineChartRender timeline={generateSampleData()} formatCurrency={formatCurrency} isSample={true} />;
  }

  // Filter and validate timeline data
  const validTimeline = timeline.filter(d => {
    return d && 
           typeof d === 'object' &&
           d.date && 
           typeof d.totalValue === 'number' && 
           typeof d.totalInvested === 'number' &&
           !isNaN(d.totalValue) &&
           !isNaN(d.totalInvested);
  });
  
  console.log('Valid timeline data:', validTimeline);
  
  // If no valid data, create sample data to show how the chart works
  if (validTimeline.length === 0) {
    console.log('No valid timeline data, showing sample');
    return <PortfolioTimelineChartRender timeline={generateSampleData()} formatCurrency={formatCurrency} isSample={true} />;
  }

  // If only 1 data point (like today), enhance with historical projection
  if (validTimeline.length === 1) {
    console.log('Only one data point found, enhancing with projected historical data');
    const realData = validTimeline[0];
    const enhancedData = generateHistoricalData(realData);
    return <PortfolioTimelineChartRender 
      timeline={enhancedData} 
      formatCurrency={formatCurrency} 
      isSample={true}
      realDataCount={1}
    />;
  }

  return <PortfolioTimelineChartRender timeline={validTimeline} formatCurrency={formatCurrency} />;
};

// Generate stable historical data projection from current real data
const generateHistoricalData = (currentData) => {
  const today = new Date();
  const currentValue = currentData.totalValue || 20120;
  const currentInvested = currentData.totalInvested || 20116;
  
  // Stable multipliers for consistent historical projection
  const dailyMultipliers = [
    0.995, 0.997, 1.001, 0.999, 1.003, 0.998, 1.002, 0.996, 1.004, 1.000,
    0.999, 1.005, 0.997, 1.001, 1.003, 0.998, 1.006, 0.999, 1.002, 1.001,
    0.997, 1.004, 0.998, 1.003, 1.000, 1.002, 0.999, 1.001, 1.005
  ];
  
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - i));
    
    if (i === 29) {
      // Last day is real data
      return {
        date: currentData.date,
        totalValue: currentValue,
        totalInvested: currentInvested,
        totalProfitLoss: currentValue - currentInvested,
        totalProfitLossPercent: ((currentValue - currentInvested) / currentInvested) * 100,
        isReal: true
      };
    }
    
    // Generate backwards projection using stable multipliers
    const daysFromEnd = 29 - i;
    const projectedInvested = Math.max(5000, currentInvested - (daysFromEnd * 500)); // ₹500/day investment
    const baseValue = projectedInvested * 1.002; // Small base growth
    const projectedValue = Math.round(baseValue * dailyMultipliers[i]);
    
    return {
      date: date.toISOString(),
      totalValue: projectedValue,
      totalInvested: projectedInvested,
      totalProfitLoss: projectedValue - projectedInvested,
      totalProfitLossPercent: ((projectedValue - projectedInvested) / projectedInvested) * 100,
      isProjected: true
    };
  });
};

// Generate stable sample data for demonstration
const generateSampleData = () => {
  const today = new Date();
  // Predefined stable progression for consistent display
  const baseInvestments = [
    20000, 20700, 21400, 22100, 22800, 23500, 24200, 24900, 25600, 26300,
    27000, 27700, 28400, 29100, 29800, 30500, 31200, 31900, 32600, 33300,
    34000, 34700, 35400, 36100, 36800, 37500, 38200, 38900, 39600, 40300
  ];
  
  const portfolioMultipliers = [
    1.001, 1.003, 0.998, 1.005, 1.002, 1.008, 0.996, 1.010, 1.004, 0.999,
    1.006, 1.012, 0.995, 1.007, 1.003, 1.009, 0.997, 1.011, 1.005, 1.001,
    1.008, 0.994, 1.013, 1.006, 1.002, 1.009, 0.998, 1.012, 1.007, 1.004
  ];
  
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - i));
    
    const totalInvested = baseInvestments[i];
    const portfolioValue = Math.round(totalInvested * portfolioMultipliers[i]);
    const profitLoss = portfolioValue - totalInvested;
    const profitLossPercent = (profitLoss / totalInvested) * 100;
    
    return {
      date: date.toISOString(),
      totalValue: portfolioValue,
      totalInvested: totalInvested,
      totalProfitLoss: profitLoss,
      totalProfitLossPercent: profitLossPercent,
      dayChange: i > 0 ? Math.round((portfolioValue - Math.round(baseInvestments[i-1] * portfolioMultipliers[i-1])) * 0.8) : 0,
      dayChangePercent: i > 0 ? ((portfolioValue - Math.round(baseInvestments[i-1] * portfolioMultipliers[i-1])) / Math.round(baseInvestments[i-1] * portfolioMultipliers[i-1])) * 100 : 0
    };
  });
};

// Recharts-based chart rendering component
const PortfolioTimelineChartRender = ({ timeline, formatCurrency, isSample = false, realDataCount = 0 }) => {
  // Transform data for Recharts
  const chartData = timeline.map(d => ({
    date: d.date ? new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : d.date,
    portfolioValue: d.totalValue || d.portfolioValue || 0,
    totalInvested: d.totalInvested || 0,
    profitLoss: d.totalProfitLoss || d.profitLoss || 0
  }));

  // Simple compact tooltip formatter
  const tooltipFormatter = (value, name) => {
    if (name === 'portfolioValue') {
      return [formatCurrency(value), 'Portfolio'];
    }
    if (name === 'totalInvested') {
      return [formatCurrency(value), 'Invested'];
    }
    return [value, name];
  };

  const tooltipLabelFormatter = (label) => {
    return label;
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
    <div className={`timeline-chart ${isSample ? 'sample-chart' : ''}`}>
      {isSample && (
        <div className="sample-indicator">
          {realDataCount === 1 ? (
            <span>📊 Today's Data + Historical Projection - Chart will grow with real daily data from tomorrow</span>
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
            <Tooltip 
              formatter={tooltipFormatter}
              labelFormatter={tooltipLabelFormatter}
              cursor={{ stroke: '#667eea', strokeWidth: 1, strokeDasharray: '3 3' }}
              wrapperStyle={{ 
                maxHeight: '80px', 
                height: 'auto',
                overflow: 'hidden',
                zIndex: 1000 
              }}
              contentStyle={{
                maxHeight: '80px',
                height: 'auto',
                padding: '6px 8px',
                fontSize: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                lineHeight: '1.2'
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="portfolioValue"
              stroke="#667eea"
              strokeWidth={3}
              dot={{ fill: '#667eea', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#667eea', strokeWidth: 2 }}
              name="Portfolio Value"
            />
            <Line
              type="monotone"
              dataKey="totalInvested"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: '#f59e0b', strokeWidth: 2 }}
              name="Total Invested"
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Performance Summary */}
      <div className="chart-info">
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
        {isSample && (
          <div className="info-item">
            <span className="info-label">📊 Chart Status:</span>
            <span className="info-value positive">
              {realDataCount === 1 ? 'Real data collection started today!' : 'Real-time chart ready with sample data'}
            </span>
          </div>
        )}
        {realDataCount === 1 && (
          <div className="info-item">
            <span className="info-label">📅 Data Collection:</span>
            <span className="info-value">Daily snapshots will build your timeline</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Generate stable sample data once and reuse
const SAMPLE_DAILY_DATA = (() => {
  const today = new Date();
  const predefinedChanges = [
    0.8, -0.3, 1.2, 0.5, -0.7, 0.9, -0.4, 1.1, 0.2, -0.6,
    0.7, 1.3, -0.8, 0.4, 0.6, -0.2, 1.0, -0.5, 0.3, 0.8,
    -0.9, 0.1, 1.4, -0.1, 0.7, 0.9, -0.3, 0.5, 1.1, -0.4
  ];
  
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - i));
    
    const dayChangePercent = predefinedChanges[i] || 0;
    const dayChange = dayChangePercent * 200;
    
    return {
      date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      fullDate: date.toISOString(),
      dayChange: Math.round(dayChange),
      dayChangePercent: Number(dayChangePercent.toFixed(2)),
      isPositive: dayChangePercent >= 0,
      portfolioValue: 20000 + Math.round(dayChange),
    };
  });
})();

// Daily Performance Chart Component - Shows daily P&L patterns
const DailyPerformanceChart = React.memo(({ timeline, formatCurrency, formatPercent }) => {
  // Use useMemo to prevent unnecessary re-computations
  const chartData = React.useMemo(() => {
    // Early return for missing data - show chart with sample data
    if (!timeline || timeline.length === 0) {
      return { data: SAMPLE_DAILY_DATA, isSample: true };
    }

    // Filter and validate timeline data for daily performance
    const validTimeline = timeline.filter(d => {
      return d && 
             typeof d === 'object' &&
             d.date && 
             typeof d.dayChange === 'number' && 
             typeof d.dayChangePercent === 'number' &&
             !isNaN(d.dayChange) &&
             !isNaN(d.dayChangePercent);
    });
    
    // If only 1 data point, enhance with sample data to show trend
    if (validTimeline.length === 1) {
      const realData = validTimeline[0];
      const historicalPattern = [
        0.5, -0.2, 0.8, 0.3, -0.4, 0.6, -0.1, 0.9, 0.2, -0.3,
        0.4, 0.7, -0.5, 0.1, 0.3, -0.2, 0.8, -0.3, 0.2, 0.5,
        -0.4, 0.1, 0.6, -0.1, 0.4, 0.3, -0.2, 0.2, 0.5
      ];
      
      const today = new Date();
      const enhancedData = Array.from({ length: 29 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (29 - i));
        
        const dayChangePercent = historicalPattern[i] || 0;
        const dayChange = dayChangePercent * 200;
        
        return {
          date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          fullDate: date.toISOString(),
          dayChange: Math.round(dayChange),
          dayChangePercent: Number(dayChangePercent.toFixed(2)),
          isPositive: dayChangePercent >= 0,
          portfolioValue: 20000 + Math.round(dayChange),
        };
      });
      
      // Add current real data
      enhancedData.push({
        date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        fullDate: new Date().toISOString(),
        dayChange: realData.dayChange,
        dayChangePercent: realData.dayChangePercent,
        isPositive: realData.dayChangePercent >= 0,
        portfolioValue: realData.portfolioValue || 20000,
      });
      
      return { data: enhancedData, isSample: false, realDataCount: 1 };
    }
    
    // If no valid data, create sample data
    if (validTimeline.length === 0) {
      return { data: SAMPLE_DAILY_DATA, isSample: true };
    }

    return { data: validTimeline, isSample: false };
  }, [timeline]);

  return (
    <DailyPerformanceChartRender 
      timeline={chartData.data} 
      formatCurrency={formatCurrency} 
      formatPercent={formatPercent} 
      isSample={chartData.isSample}
      realDataCount={chartData.realDataCount || 0}
    />
  );
});

// Recharts-based daily performance chart rendering component
const DailyPerformanceChartRender = React.memo(({ timeline, formatCurrency, formatPercent, isSample = false, realDataCount = 0 }) => {
  // Transform data for Recharts Bar Chart
  const chartData = timeline.map(d => ({
    date: d.date,
    dayChange: d.dayChange || 0,
    dayChangePercent: d.dayChangePercent || 0,
    isPositive: (d.dayChange || 0) >= 0,
    fill: (d.dayChange || 0) >= 0 ? '#10b981' : '#ef4444', // Green for gains, red for losses
    isReal: d.isReal || false
  }));

  // Calculate performance statistics
  const totalDays = chartData.length;
  const profitDays = chartData.filter(d => d.isPositive).length;
  const lossDays = totalDays - profitDays;
  const bestDay = Math.max(...chartData.map(d => d.dayChangePercent));
  const worstDay = Math.min(...chartData.map(d => d.dayChangePercent));
  const avgDaily = chartData.reduce((sum, d) => sum + d.dayChangePercent, 0) / totalDays;
  const winRate = (profitDays / totalDays) * 100;

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
    <div className={`daily-performance-chart ${isSample ? 'sample-chart' : ''}`}>
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
        <h4>Daily Profit & Loss Pattern</h4>
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
});

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
