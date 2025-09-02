import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Activity,
  Clock,
  Info,
  Award,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Trans from './Trans';
import './StockAnalysis.css';

const StockAnalysis = () => {
  const [activeInterval, setActiveInterval] = useState('1M');
  const [analysisData, setAnalysisData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProgress, setUserProgress] = useState({
    intervalsExplored: new Set(),
    companiesAnalyzed: new Set(),
    analysisStreak: 0,
    lastAnalysisDate: null
  });
  const [showTooltips, setShowTooltips] = useState(false);

  const { user } = useAuth();

  const timeIntervals = [
    { key: '1M', label: '1M', name: '1 Month' },
    { key: '3M', label: '3M', name: '3 Months' },
    { key: '6M', label: '6M', name: '6 Months' },
    { key: '1Y', label: '1Y', name: '1 Year' },
    { key: 'MAX', label: 'MAX', name: 'All Time' }
  ];

  const companies = [
    { symbol: 'RELIANCE', name: 'Reliance Industries', color: '#e74c3c' },
    { symbol: 'TCS', name: 'Tata Consultancy Services', color: '#3498db' },
    { symbol: 'INFY', name: 'Infosys Limited', color: '#2ecc71' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', color: '#f39c12' }
  ];

  const prepareChartData = useCallback((candles) => {
    if (!candles || !Array.isArray(candles)) return [];
    
    return candles.map(candle => ({
      timestamp: new Date(candle.timestamp).getTime(),
      date: new Date(candle.timestamp).toLocaleDateString(),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    })).sort((a, b) => a.timestamp - b.timestamp);
  }, []);

  const checkAchievement = useCallback(async (achievementId) => {
    try {
      await axios.post('/api/achievements/check', {
        achievementId,
        userId: user?.id
      });
    } catch (error) {
      console.error('Error checking achievement:', error);
    }
  }, [user?.id]);

  const trackIntervalExploration = useCallback((interval) => {
    setUserProgress(prev => {
      const newIntervals = new Set(prev.intervalsExplored);
      newIntervals.add(interval);
      
      // Check for chart explorer achievement
      if (newIntervals.size >= 3) {
        checkAchievement('chart_explorer');
      }

      return {
        ...prev,
        intervalsExplored: newIntervals
      };
    });
  }, [checkAchievement]);

  const trackCompanyAnalysis = useCallback((symbol) => {
    setUserProgress(prev => {
      const newCompanies = new Set(prev.companiesAnalyzed);
      newCompanies.add(symbol);
      
      // Check for technical analyst achievement
      if (newCompanies.size >= 4) {
        checkAchievement('technical_analyst');
      }

      return {
        ...prev,
        companiesAnalyzed: newCompanies
      };
    });
  }, [checkAchievement]);

  const trackAnalysisStreak = useCallback(() => {
    setUserProgress(prev => {
      const today = new Date().toDateString();
      const lastDate = prev.lastAnalysisDate;
      
      let newStreak = 1;
      if (lastDate) {
        const lastAnalysis = new Date(lastDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastAnalysis.toDateString() === yesterday.toDateString()) {
          newStreak = prev.analysisStreak + 1;
        } else if (lastAnalysis.toDateString() === today) {
          newStreak = prev.analysisStreak;
        }
      }
      
      // Check for analysis streak achievement
      if (newStreak >= 7) {
        checkAchievement('analysis_streak');
      }

      return {
        ...prev,
        analysisStreak: newStreak,
        lastAnalysisDate: today
      };
    });
  }, [checkAchievement]);

  const fetchAnalysisData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/analysis/historical-all/${activeInterval}`);
      
      if (response.data.success) {
        const dataMap = {};
        response.data.data.forEach(item => {
          if (item.success && item.data) {
            dataMap[item.symbol] = {
              ...item.data,
              chartData: prepareChartData(item.data.candles)
            };
          }
        });
        setAnalysisData(dataMap);
        
        // Track interval exploration for achievements
        trackIntervalExploration(activeInterval);
      }
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeInterval, prepareChartData, trackIntervalExploration]);

  const loadUserProgress = useCallback(() => {
    const saved = localStorage.getItem(`analysis_progress_${user?.id}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setUserProgress(prev => ({
        ...prev,
        ...parsed,
        intervalsExplored: new Set(parsed.intervalsExplored || []),
        companiesAnalyzed: new Set(parsed.companiesAnalyzed || [])
      }));
    }
  }, [user?.id]);

  const saveUserProgress = useCallback(() => {
    const toSave = {
      ...userProgress,
      intervalsExplored: Array.from(userProgress.intervalsExplored),
      companiesAnalyzed: Array.from(userProgress.companiesAnalyzed)
    };
    localStorage.setItem(`analysis_progress_${user?.id}`, JSON.stringify(toSave));
  }, [userProgress, user?.id]);

  useEffect(() => {
    fetchAnalysisData();
    loadUserProgress();
  }, [fetchAnalysisData, loadUserProgress]);

  useEffect(() => {
    saveUserProgress();
  }, [saveUserProgress]);

  const handleCompanyClick = (symbol) => {
    trackCompanyAnalysis(symbol);
    trackAnalysisStreak();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalysisData();
    setRefreshing(false);
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'UPWARD':
        return <TrendingUp className="trend-icon trend-up" size={16} />;
      case 'DOWNWARD':
        return <TrendingDown className="trend-icon trend-down" size={16} />;
      default:
        return <Activity className="trend-icon trend-sideways" size={16} />;
    }
  };

  const getVolatilityColor = (volatility) => {
    switch (volatility) {
      case 'HIGH':
        return '#e74c3c';
      case 'MEDIUM':
        return '#f39c12';
      default:
        return '#2ecc71';
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="analysis-tooltip">
          <p className="tooltip-date">{data.date}</p>
          <div className="tooltip-values">
            <div className="tooltip-row">
              <span className="tooltip-label"><Trans>Open:</Trans></span>
              <span className="tooltip-value">₹{data.open?.toFixed(2)}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label"><Trans>High:</Trans></span>
              <span className="tooltip-value">₹{data.high?.toFixed(2)}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label"><Trans>Low:</Trans></span>
              <span className="tooltip-value">₹{data.low?.toFixed(2)}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label"><Trans>Close:</Trans></span>
              <span className="tooltip-value">₹{data.close?.toFixed(2)}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label"><Trans>Volume:</Trans></span>
              <span className="tooltip-value">{(data.volume / 1000000).toFixed(2)}M</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="analysis-loading">
        <div className="loading-spinner"></div>
        <p><Trans>Loading stock analysis data...</Trans></p>
      </div>
    );
  }

  return (
    <div className="stock-analysis">
      {/* Header */}
      <div className="analysis-header">
        <div className="header-title">
          <BarChart3 className="header-icon" size={24} />
          <h2><Trans>📊 Stock Analysis</Trans></h2>
          <button 
            className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={16} />
          </button>
        </div>
        
        {/* Progress Stats */}
        <div className="progress-stats">
          <div className="stat-item">
            <Award size={16} />
            <span><Trans>Intervals Explored:</Trans> {userProgress.intervalsExplored.size}/5</span>
          </div>
          <div className="stat-item">
            <Activity size={16} />
            <span><Trans>Companies Analyzed:</Trans> {userProgress.companiesAnalyzed.size}/4</span>
          </div>
          <div className="stat-item">
            <Clock size={16} />
            <span><Trans>Analysis Streak:</Trans> {userProgress.analysisStreak} days</span>
          </div>
        </div>
      </div>

      {/* Time Interval Selector */}
      <div className="interval-selector">
        <div className="interval-tabs">
          {timeIntervals.map(interval => (
            <button
              key={interval.key}
              className={`interval-tab ${activeInterval === interval.key ? 'active' : ''}`}
              onClick={() => setActiveInterval(interval.key)}
            >
              {interval.label}
            </button>
          ))}
        </div>
        
        <button 
          className="tooltip-toggle"
          onClick={() => setShowTooltips(!showTooltips)}
        >
          <Info size={16} />
          <Trans>Help</Trans>
        </button>
      </div>

      {/* Company Analysis Grid */}
      <div className="analysis-grid">
        {companies.map(company => {
          const data = analysisData[company.symbol];
          if (!data) {
            return (
              <div key={company.symbol} className="analysis-card loading-card">
                <div className="card-header">
                  <h3>{company.symbol}</h3>
                  <p className="company-name">{company.name}</p>
                </div>
                <div className="loading-placeholder">
                  <Trans>Loading chart data...</Trans>
                </div>
              </div>
            );
          }

          return (
            <div 
              key={company.symbol} 
              className="analysis-card"
              onClick={() => handleCompanyClick(company.symbol)}
            >
              {/* Card Header */}
              <div className="card-header">
                <div className="company-info">
                  <h3 style={{ color: company.color }}>{company.symbol}</h3>
                  <p className="company-name">{company.name}</p>
                </div>
                <div className="data-age">
                  <Clock size={12} />
                  <span>{data.dataAge}</span>
                </div>
              </div>

              {/* Chart */}
              <div className="fix-chart">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      domain={['dataMin - 5', 'dataMax + 5']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="close" 
                      stroke={company.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: company.color }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Analysis Summary */}
              <div className="analysis-summary">
                <div className="summary-row">
                  <div className="summary-item">
                    <span className="summary-label">
                      {getTrendIcon(data.analysis?.trend)}
                      <Trans>Trend:</Trans>
                    </span>
                    <span className="summary-value">
                      <Trans>{data.analysis?.trend || 'ANALYZING'}</Trans>
                    </span>
                  </div>
                  
                  <div className="summary-item">
                    <span className="summary-label">
                      <Activity size={12} />
                      <Trans>Volatility:</Trans>
                    </span>
                    <span 
                      className="summary-value"
                      style={{ color: getVolatilityColor(data.analysis?.volatility) }}
                    >
                      <Trans>{data.analysis?.volatility || 'ANALYZING'}</Trans>
                    </span>
                  </div>
                </div>

                <div className="gain-loss-indicator">
                  {data.analysis?.gainLoss && (
                    <div className={`gain-loss ${data.analysis.gainLoss.type.toLowerCase()}`}>
                      <span className="percentage">
                        {data.analysis.gainLoss.type === 'GAIN' ? '+' : ''}
                        {data.analysis.gainLoss.percentage?.toFixed(2)}%
                      </span>
                      <span className="amount">
                        (₹{Math.abs(data.analysis.gainLoss.amount || 0).toFixed(2)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltips and Help */}
      {showTooltips && (
        <div className="help-overlay">
          <div className="help-content">
            <h3><Trans>📚 Understanding Stock Charts</Trans></h3>
            <div className="help-sections">
              <div className="help-section">
                <h4><Trans>📈 Trend Indicators</Trans></h4>
                <p><Trans>UPWARD: Stock price is generally rising</Trans></p>
                <p><Trans>DOWNWARD: Stock price is generally falling</Trans></p>
                <p><Trans>SIDEWAYS: Stock price is moving in a range</Trans></p>
              </div>
              
              <div className="help-section">
                <h4><Trans>⚡ Volatility Levels</Trans></h4>
                <p><Trans>HIGH: Large price swings (risky but potentially rewarding)</Trans></p>
                <p><Trans>MEDIUM: Moderate price movements</Trans></p>
                <p><Trans>LOW: Stable price movements (safer investment)</Trans></p>
              </div>
              
              <div className="help-section">
                <h4><Trans>🎯 Analysis Tips</Trans></h4>
                <p><Trans>• Compare different time intervals to spot patterns</Trans></p>
                <p><Trans>• Look for consistent trends across multiple timeframes</Trans></p>
                <p><Trans>• High volatility means both higher risk and reward potential</Trans></p>
              </div>
            </div>
            
            <button 
              className="close-help"
              onClick={() => setShowTooltips(false)}
            >
              <Trans>Got it!</Trans>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAnalysis;
