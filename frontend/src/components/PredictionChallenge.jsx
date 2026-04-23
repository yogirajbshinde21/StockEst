import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Trans from './Trans';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  Trophy,
  Zap,
  ChevronDown,
  ChevronUp,
  Send,
  Info,
  Award,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Flame,
  RefreshCw
} from 'lucide-react';
import './PredictionChallenge.css';

const PredictionChallenge = () => {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [userPredictions, setUserPredictions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userHistory, setUserHistory] = useState([]);
  const [userStreak, setUserStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('predict'); // predict, history, leaderboard
  const [expandedCard, setExpandedCard] = useState(null);
  const [userInputs, setUserInputs] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [submitMessages, setSubmitMessages] = useState({});
  const [generating, setGenerating] = useState(false);

  // Fetch predictions data
  const fetchPredictions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/predictions/today');
      if (res.data.success) {
        setPredictions(res.data.data.predictions || []);
        setUserPredictions(res.data.data.userPredictions || []);
      }
    } catch (err) {
      console.error('Failed to fetch predictions:', err);
      setError('Failed to load predictions. They may not have been generated yet.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await axios.get('/api/predictions/challenge/leaderboard');
      if (res.data.success) {
        setLeaderboard(res.data.data.leaderboard || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  }, []);

  const fetchUserHistory = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get('/api/predictions/challenge/my-history');
      if (res.data.success) {
        setUserHistory(res.data.data.history || []);
        setUserStreak(res.data.data.streak || 0);
      }
    } catch (err) {
      console.error('Failed to fetch user history:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchPredictions();
    fetchLeaderboard();
    fetchUserHistory();
  }, [fetchPredictions, fetchLeaderboard, fetchUserHistory]);

  // Generate predictions manually (for testing/first time)
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await axios.post('/api/predictions/generate');
      await fetchPredictions();
    } catch (err) {
      console.error('Failed to generate predictions:', err);
      setError('Failed to generate predictions. Make sure historical data is available.');
    } finally {
      setGenerating(false);
    }
  };

  // Submit user prediction
  const handleSubmit = async (instrumentKey) => {
    const price = parseFloat(userInputs[instrumentKey]);
    if (isNaN(price) || price <= 0) {
      setSubmitMessages(prev => ({ ...prev, [instrumentKey]: { type: 'error', text: 'Please enter a valid price' } }));
      return;
    }

    setSubmitting(prev => ({ ...prev, [instrumentKey]: true }));
    try {
      const res = await axios.post('/api/predictions/challenge/submit', {
        instrumentKey,
        predictedPrice: price
      });
      if (res.data.success) {
        setSubmitMessages(prev => ({
          ...prev,
          [instrumentKey]: { type: 'success', text: '✅ +5 XP! Prediction submitted!' }
        }));
        setUserInputs(prev => ({ ...prev, [instrumentKey]: '' }));
        fetchUserHistory();
        fetchPredictions();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit prediction';
      setSubmitMessages(prev => ({ ...prev, [instrumentKey]: { type: 'error', text: msg } }));
    } finally {
      setSubmitting(prev => ({ ...prev, [instrumentKey]: false }));
    }
  };

  // Check if user already predicted this stock
  const hasUserPredicted = (instrumentKey) => {
    return userPredictions.some(p => p.instrumentKey === instrumentKey && p.status === 'PENDING');
  };

  // Get confidence percentage
  const getConfidenceWidth = (pred) => {
    if (!pred.confidenceUpper || !pred.confidenceLower || !pred.predictedPrice) return 0;
    return ((pred.confidenceUpper - pred.confidenceLower) / pred.predictedPrice * 100).toFixed(1);
  };

  // Direction indicator
  const getPriceDirection = (predicted, current) => {
    if (!current || current <= 0) return 'neutral';
    const change = ((predicted - current) / current) * 100;
    if (change > 0.5) return 'up';
    if (change < -0.5) return 'down';
    return 'neutral';
  };

  if (loading) {
    return (
      <div className="prediction-loading">
        <div className="prediction-spinner"></div>
        <p><Trans>Loading AI Predictions...</Trans></p>
      </div>
    );
  }

  return (
    <div className="prediction-challenge">
      {/* Header */}
      <div className="prediction-header">
        <div className="prediction-header-left">
          <div className="prediction-title-row">
            <div className="prediction-icon-wrapper">
              <Brain size={24} />
            </div>
            <h2><Trans>AI Prediction Challenge</Trans></h2>
          </div>
          <p className="prediction-subtitle">
            <Trans>Can you predict better than our AI? Submit your price prediction and earn XP!</Trans>
          </p>
        </div>
        <div className="prediction-header-stats">
          {userStreak > 0 && (
            <div className="streak-badge">
              <Flame size={16} />
              <span>{userStreak} <Trans>day streak</Trans></span>
            </div>
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <div className="prediction-tabs">
        <button
          className={`prediction-tab ${activeSection === 'predict' ? 'active' : ''}`}
          onClick={() => setActiveSection('predict')}
        >
          <Target size={16} />
          <Trans>Predict</Trans>
        </button>
        <button
          className={`prediction-tab ${activeSection === 'history' ? 'active' : ''}`}
          onClick={() => setActiveSection('history')}
        >
          <BarChart3 size={16} />
          <Trans>My History</Trans>
        </button>
        <button
          className={`prediction-tab ${activeSection === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveSection('leaderboard')}
        >
          <Trophy size={16} />
          <Trans>Leaderboard</Trans>
        </button>
      </div>

      {/* Disclaimer */}
      <div className="prediction-disclaimer">
        <AlertTriangle size={14} />
        <span>
          <Trans>Educational predictions only — not investment advice. Results may vary significantly.</Trans>
        </span>
      </div>

      {/* ─── PREDICT SECTION ─── */}
      {activeSection === 'predict' && (
        <div className="prediction-cards-section">
          {predictions.length === 0 ? (
            <div className="prediction-empty">
              <Brain size={48} className="empty-icon" />
              <h3><Trans>No Predictions Available Yet</Trans></h3>
              <p><Trans>Predictions are generated daily after market close (4:30 PM IST).</Trans></p>
              <button className="generate-btn" onClick={handleGenerate} disabled={generating}>
                <RefreshCw size={16} className={generating ? 'spinning' : ''} />
                <Trans>{generating ? 'Generating...' : 'Generate Now'}</Trans>
              </button>
            </div>
          ) : (
            <div className="prediction-cards-grid">
              {predictions.map(pred => {
                const direction = getPriceDirection(pred.predictedPrice, pred.indicators?.rsi14 > 50 ? pred.predictedPrice * 0.99 : pred.predictedPrice * 1.01);
                const isExpanded = expandedCard === pred.instrumentKey;
                const alreadyPredicted = hasUserPredicted(pred.instrumentKey);

                return (
                  <div key={pred.instrumentKey || pred._id} className="prediction-card">
                    {/* Card Header */}
                    <div className="pred-card-header">
                      <div className="pred-stock-info">
                        <h3 className="pred-symbol">{pred.symbol}</h3>
                        <span className="pred-company">{pred.companyName}</span>
                      </div>
                      <div className="pred-model-badge">
                        <Zap size={12} />
                        <span>AI</span>
                      </div>
                    </div>

                    {/* AI Prediction */}
                    <div className="pred-price-section">
                      <div className="pred-label"><Trans>AI Predicts (Next Day Close)</Trans></div>
                      <div className={`pred-price ${direction}`}>
                        ₹{pred.predictedPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {direction === 'up' && <TrendingUp size={18} />}
                        {direction === 'down' && <TrendingDown size={18} />}
                      </div>
                    </div>

                    {/* Confidence Band */}
                    <div className="pred-confidence">
                      <div className="confidence-label">
                        <span><Trans>Confidence Range</Trans></span>
                        <span className="confidence-pct">±{getConfidenceWidth(pred)}%</span>
                      </div>
                      <div className="confidence-bar-container">
                        <div className="confidence-bar">
                          <div
                            className="confidence-fill"
                            style={{
                              left: `${Math.max(0, 50 - parseFloat(getConfidenceWidth(pred)) * 2.5)}%`,
                              width: `${Math.min(100, parseFloat(getConfidenceWidth(pred)) * 5)}%`
                            }}
                          ></div>
                          <div className="confidence-marker"></div>
                        </div>
                        <div className="confidence-range-labels">
                          <span>₹{pred.confidenceLower?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                          <span>₹{pred.confidenceUpper?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Why Section (expandable) */}
                    <button
                      className="pred-why-toggle"
                      onClick={() => setExpandedCard(isExpanded ? null : pred.instrumentKey)}
                    >
                      <Info size={14} />
                      <Trans>Why this price?</Trans>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isExpanded && pred.indicators && (
                      <div className="pred-indicators">
                        <div className="indicator-grid">
                          <div className="indicator-item">
                            <span className="indicator-label">RSI (14)</span>
                            <span className={`indicator-value ${pred.indicators.rsi14 < 30 ? 'bullish' : pred.indicators.rsi14 > 70 ? 'bearish' : 'neutral'}`}>
                              {pred.indicators.rsi14?.toFixed(1)}
                            </span>
                          </div>
                          <div className="indicator-item">
                            <span className="indicator-label">MACD</span>
                            <span className={`indicator-value ${pred.indicators.macdSignal?.toLowerCase()}`}>
                              {pred.indicators.macdSignal}
                            </span>
                          </div>
                          <div className="indicator-item">
                            <span className="indicator-label"><Trans>SMA Position</Trans></span>
                            <span className={`indicator-value ${pred.indicators.smaPosition === 'ABOVE_SMA' ? 'bullish' : pred.indicators.smaPosition === 'BELOW_SMA' ? 'bearish' : 'neutral'}`}>
                              {pred.indicators.smaPosition?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="indicator-item">
                            <span className="indicator-label"><Trans>Volatility</Trans></span>
                            <span className={`indicator-value ${pred.indicators.volatility?.toLowerCase()}`}>
                              {pred.indicators.volatility}
                            </span>
                          </div>
                          <div className="indicator-item">
                            <span className="indicator-label"><Trans>Trend</Trans></span>
                            <span className={`indicator-value ${pred.indicators.trendStrength?.includes('UP') ? 'bullish' : pred.indicators.trendStrength?.includes('DOWN') ? 'bearish' : 'neutral'}`}>
                              {pred.indicators.trendStrength?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="indicator-item">
                            <span className="indicator-label"><Trans>Bollinger</Trans></span>
                            <span className="indicator-value neutral">
                              {pred.indicators.bollingerPosition}
                            </span>
                          </div>
                        </div>
                        {pred.indicators.explanation && (
                          <div className="indicator-explanation">
                            <p>{pred.indicators.explanation}</p>
                          </div>
                        )}
                        {pred.modelMetrics && (
                          <div className="model-metrics">
                            <span>Model: {pred.modelMetrics.modelVersion}</span>
                            <span>R²: {pred.modelMetrics.r2Score?.toFixed(3)}</span>
                            <span>MAE: ₹{pred.modelMetrics.maeRupees?.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* User Prediction Input */}
                    <div className="pred-user-input">
                      {alreadyPredicted ? (
                        <div className="pred-already-submitted">
                          <CheckCircle size={16} />
                          <Trans>Prediction submitted!</Trans>
                        </div>
                      ) : (
                        <>
                          <div className="pred-input-row">
                            <span className="pred-input-label"><Trans>Your prediction:</Trans></span>
                            <div className="pred-input-wrapper">
                              <span className="input-currency">₹</span>
                              <input
                                type="number"
                                placeholder="Enter price"
                                value={userInputs[pred.instrumentKey] || ''}
                                onChange={(e) => setUserInputs(prev => ({
                                  ...prev,
                                  [pred.instrumentKey]: e.target.value
                                }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSubmit(pred.instrumentKey);
                                }}
                                disabled={submitting[pred.instrumentKey]}
                                min="0"
                                step="0.05"
                              />
                              <button
                                className="pred-submit-btn"
                                onClick={() => handleSubmit(pred.instrumentKey)}
                                disabled={submitting[pred.instrumentKey] || !userInputs[pred.instrumentKey]}
                              >
                                <Send size={14} />
                              </button>
                            </div>
                          </div>
                          {submitMessages[pred.instrumentKey] && (
                            <div className={`pred-message ${submitMessages[pred.instrumentKey].type}`}>
                              {submitMessages[pred.instrumentKey].text}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── HISTORY SECTION ─── */}
      {activeSection === 'history' && (
        <div className="prediction-history-section">
          {userHistory.length === 0 ? (
            <div className="prediction-empty">
              <BarChart3 size={48} className="empty-icon" />
              <h3><Trans>No Prediction History</Trans></h3>
              <p><Trans>Start making predictions to see your history here!</Trans></p>
            </div>
          ) : (
            <div className="history-list">
              {userHistory.map((entry, idx) => (
                <div key={entry._id || idx} className={`history-item ${entry.status === 'EVALUATED' ? (entry.userBeatAI ? 'beat-ai' : 'ai-won') : 'pending'}`}>
                  <div className="history-main">
                    <div className="history-stock">
                      <span className="history-symbol">{entry.symbol}</span>
                      <span className="history-date">
                        {new Date(entry.predictionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <div className="history-prices">
                      <div className="history-price-item">
                        <span className="history-label"><Trans>You</Trans></span>
                        <span className="history-value">₹{entry.userPredictedPrice?.toFixed(2)}</span>
                      </div>
                      <div className="history-price-item">
                        <span className="history-label">AI</span>
                        <span className="history-value">₹{entry.aiPredictedPrice?.toFixed(2)}</span>
                      </div>
                      {entry.actualPrice && (
                        <div className="history-price-item actual">
                          <span className="history-label"><Trans>Actual</Trans></span>
                          <span className="history-value">₹{entry.actualPrice?.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <div className="history-result">
                      {entry.status === 'EVALUATED' ? (
                        <>
                          <div className={`history-accuracy ${entry.userAccuracy <= 2 ? 'great' : entry.userAccuracy <= 5 ? 'good' : 'ok'}`}>
                            {entry.userAccuracy?.toFixed(1)}% <Trans>error</Trans>
                          </div>
                          {entry.userBeatAI ? (
                            <div className="history-badge beat">
                              <Award size={14} />
                              <Trans>Beat AI!</Trans>
                            </div>
                          ) : (
                            <div className="history-badge lost">
                              <XCircle size={14} />
                              <Trans>AI won</Trans>
                            </div>
                          )}
                          <div className="history-xp">+{entry.xpEarned} XP</div>
                        </>
                      ) : (
                        <div className="history-pending-badge">
                          <Trans>Awaiting results...</Trans>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── LEADERBOARD SECTION ─── */}
      {activeSection === 'leaderboard' && (
        <div className="prediction-leaderboard-section">
          {leaderboard.length === 0 ? (
            <div className="prediction-empty">
              <Trophy size={48} className="empty-icon" />
              <h3><Trans>No Leaderboard Data Yet</Trans></h3>
              <p><Trans>Be the first to submit predictions and start climbing the ranks!</Trans></p>
            </div>
          ) : (
            <div className="leaderboard-list">
              {leaderboard.map((entry, idx) => (
                <div key={entry._id} className={`leaderboard-item ${idx < 3 ? 'top-three' : ''}`}>
                  <div className="leaderboard-rank">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </div>
                  <div className="leaderboard-user">
                    <span className="leaderboard-name">{entry.userName}</span>
                    <span className="leaderboard-level">Lv.{entry.userLevel || 1}</span>
                  </div>
                  <div className="leaderboard-stats">
                    <div className="leaderboard-stat">
                      <Zap size={12} />
                      <span>{entry.totalXP} XP</span>
                    </div>
                    <div className="leaderboard-stat">
                      <Target size={12} />
                      <span>{entry.totalPredictions} <Trans>predictions</Trans></span>
                    </div>
                    <div className="leaderboard-stat">
                      <Trophy size={12} />
                      <span>{entry.totalBeatAI} <Trans>wins vs AI</Trans></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PredictionChallenge;
