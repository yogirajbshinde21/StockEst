import React, { useState, useEffect, useCallback } from 'react';
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
import './PortfolioIntelligence.css';

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
      setDashboardData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
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
    { value: '7', label: '7D' },
    { value: '30', label: '1M' },
    { value: '90', label: '3M' },
    { value: '180', label: '6M' },
    { value: '365', label: '1Y' }
  ];

  const views = [
    { value: 'overview', label: 'Overview', icon: Activity },
    { value: 'performance', label: 'Performance', icon: LineChart },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'milestones', label: 'Milestones', icon: Award }
  ];

  if (loading) {
    return (
      <div className="portfolio-intelligence-loading">
        <div className="loading-spinner">
          <RefreshCw className="spin" size={48} />
        </div>
        <p>Loading Portfolio Intelligence...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portfolio-intelligence-error">
        <AlertCircle size={48} />
        <h3>Failed to load portfolio data</h3>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="retry-btn">
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    );
  }

  const { timeline, analytics, milestones } = dashboardData || {};

  return (
    <div className="portfolio-intelligence">
      {/* Header */}
      <div className="intelligence-header">
        <div className="header-content">
          <h1 className="intelligence-title">
            <Zap className="title-icon" />
            Portfolio Intelligence Dashboard
          </h1>
          <p className="intelligence-subtitle">
            Advanced analytics and insights for your investment journey
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
            Refresh
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
  const currentValue = timeline?.length > 0 ? timeline[timeline.length - 1]?.totalValue : 0;
  const invested = timeline?.length > 0 ? timeline[timeline.length - 1]?.totalInvested : 0;
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
        <PortfolioTimelineChart 
          timeline={timeline} 
          formatCurrency={formatCurrency}
        />
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
  if (!timeline || timeline.length === 0) {
    return <div className="chart-no-data">No timeline data available</div>;
  }

  const maxValue = Math.max(...timeline.map(d => Math.max(d.totalValue, d.totalInvested)));
  const minValue = Math.min(...timeline.map(d => Math.min(d.totalValue, d.totalInvested)));
  const range = maxValue - minValue;

  return (
    <div className="timeline-chart">
      <svg viewBox="0 0 800 300" className="chart-svg">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(percent => (
          <line
            key={percent}
            x1="50"
            y1={50 + (percent * 200) / 100}
            x2="750"
            y2={50 + (percent * 200) / 100}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
        ))}
        
        {/* Portfolio value line */}
        <polyline
          points={timeline.map((d, i) => {
            const x = 50 + (i * 700) / (timeline.length - 1);
            const y = 250 - ((d.totalValue - minValue) / range) * 200;
            return `${x},${y}`;
          }).join(' ')}
          fill="none"
          stroke="#667eea"
          strokeWidth="3"
          className="portfolio-line"
        />
        
        {/* Invested value line */}
        <polyline
          points={timeline.map((d, i) => {
            const x = 50 + (i * 700) / (timeline.length - 1);
            const y = 250 - ((d.totalInvested - minValue) / range) * 200;
            return `${x},${y}`;
          }).join(' ')}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="5,5"
          className="invested-line"
        />
        
        {/* Data points */}
        {timeline.map((d, i) => {
          const x = 50 + (i * 700) / (timeline.length - 1);
          const y = 250 - ((d.totalValue - minValue) / range) * 200;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="#667eea"
              className="data-point"
            />
          );
        })}
      </svg>
      
      {/* Chart labels */}
      <div className="chart-labels">
        <div className="y-axis-labels">
          {[maxValue, (maxValue + minValue) / 2, minValue].map((value, i) => (
            <div key={i} className="y-label" style={{ top: `${i * 50}%` }}>
              {formatCurrency(value)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Daily Performance Chart Component
const DailyPerformanceChart = ({ timeline, formatCurrency, formatPercent }) => {
  if (!timeline || timeline.length === 0) {
    return <div className="chart-no-data">No performance data available</div>;
  }

  return (
    <div className="daily-performance-chart">
      <div className="performance-bars">
        {timeline.map((day, index) => (
          <div key={index} className="performance-day">
            <div 
              className={`performance-bar ${day.dayChangePercent >= 0 ? 'positive' : 'negative'}`}
              style={{
                height: `${Math.min(Math.abs(day.dayChangePercent || 0) * 10, 100)}px`,
                minHeight: '2px'
              }}
              title={`${new Date(day.date).toLocaleDateString()}: ${formatPercent(day.dayChangePercent)}`}
            ></div>
          </div>
        ))}
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
