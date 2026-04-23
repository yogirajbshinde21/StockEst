import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import StockList from '../components/StockList';
import Portfolio from '../components/Portfolio';
import Watchlist from '../components/Watchlist';
import TradingModal from '../components/TradingModal';
import LanguageSelector from '../components/LanguageSelector';
import NewsSection from '../components/NewsSection';
import ChatBot from '../components/ChatBot';
import Trans from '../components/Trans';
import AchievementsList from '../components/AchievementsList';
import AchievementNotification from '../components/AchievementNotification';
import StockAnalysis from '../components/StockAnalysis';
import PredictionChallenge from '../components/PredictionChallenge';
import AnimatedPrice from '../components/AnimatedPrice';
import { usePriceTracker, usePortfolioTracker } from '../hooks/usePriceTracker';
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Activity,
  LogOut,
  Menu,
  X,
  Wallet,
  Target,
  Clock,
  Newspaper,
  Heart,
  Trophy,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Zap,
  Brain
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('stocks');
  const [tradingModalOpen, setTradingModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [tradingAction, setTradingAction] = useState('BUY');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [portfolioData, setPortfolioData] = useState(null);
  const [achievementNotification, setAchievementNotification] = useState(null);
  const [showAchievementNotification, setShowAchievementNotification] = useState(false);

  const { user, logout } = useAuth();
  const { 
    stockData, 
    portfolioData: socketPortfolioData, 
    isConnected, 
    getTopGainers, 
    getTopLosers 
  } = useSocket();
  const navigate = useNavigate();

  // Add price tracking hooks
  const { getPriceInfo } = usePriceTracker(stockData?.stocks || [], 'instrumentKey', 'currentPrice');
  const { getPreviousValue } = usePortfolioTracker(portfolioData, user);

  // Update portfolio data from socket
  useEffect(() => {
    if (socketPortfolioData) {
      setPortfolioData(socketPortfolioData);
    }
  }, [socketPortfolioData]);

  // Listen for achievement notifications
  useEffect(() => {
    const handleAchievementNotification = (event) => {
      if (event.detail && event.detail.achievement) {
        setAchievementNotification(event.detail.achievement);
        setShowAchievementNotification(true);
      }
    };

    window.addEventListener('achievementUnlocked', handleAchievementNotification);
    
    return () => {
      window.removeEventListener('achievementUnlocked', handleAchievementNotification);
    };
  }, []);

  const handleTrade = (stock, action) => {
    setSelectedStock(stock);
    setTradingAction(action);
    setTradingModalOpen(true);
  };

  const handleCloseAchievementNotification = () => {
    setShowAchievementNotification(false);
    setAchievementNotification(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  

  const topGainers = getTopGainers(3);
  const topLosers = getTopLosers(3);

  return (
    <div className="dashboard">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
      
      {/* Sidebar */}
      <div className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon-wrapper special">
              <TrendingUp className="brand-icon" />
              <Zap className="brand-lightning" size={12} />
            </div>
            {!sidebarCollapsed && <Trans>Stock Simulator</Trans>}
          </div>
          <div className="sidebar-controls">
            <button 
              className="sidebar-toggle desktop-only"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button 
              className="sidebar-close mobile-only"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'stocks' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('stocks');
              setSidebarOpen(false);
            }}
            title="Market"
          >
            <div className="nav-icon-wrapper">
              <Activity size={20} />
            </div>
            {!sidebarCollapsed && <Trans>Market</Trans>}
          </button>
          
          <button
            className={`nav-item ${activeTab === 'portfolio' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('portfolio');
              setSidebarOpen(false);
            }}
            title="Portfolio"
          >
            <div className="nav-icon-wrapper">
              <PieChart size={20} />
            </div>
            {!sidebarCollapsed && <Trans>Portfolio</Trans>}
          </button>

          <button
            className={`nav-item ${activeTab === 'watchlist' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('watchlist');
              setSidebarOpen(false);
            }}
            title="Watchlist"
          >
            <div className="nav-icon-wrapper">
              <Heart size={20} />
            </div>
            {!sidebarCollapsed && <Trans>Watchlist</Trans>}
          </button>

          <button
            className={`nav-item ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('analysis');
              setSidebarOpen(false);
            }}
            title="Analysis"
          >
            <div className="nav-icon-wrapper">
              <BarChart3 size={20} />
            </div>
            {!sidebarCollapsed && <Trans>Analysis</Trans>}
          </button>

          <button
            className={`nav-item ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('news');
              setSidebarOpen(false);
            }}
            title="News"
          >
            <div className="nav-icon-wrapper">
              <Newspaper size={20} />
            </div>
            {!sidebarCollapsed && <Trans>News</Trans>}
          </button>

          <button
            className={`nav-item ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('achievements');
              setSidebarOpen(false);
            }}
            title="Leaderboard"
          >
            <div className="nav-icon-wrapper">
              <Trophy size={20} />
            </div>
             {!sidebarCollapsed && <Trans>Leaderboard</Trans>}
          </button>

          <button
            className={`nav-item ${activeTab === 'predictions' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('predictions');
              setSidebarOpen(false);
            }}
            title="AI Predict"
          >
            <div className="nav-icon-wrapper">
              <Brain size={20} />
            </div>
            {!sidebarCollapsed && <Trans>AI Predict</Trans>}
          </button>
        </div>

        <div className="sidebar-footer">
          {!sidebarCollapsed && (
            <div className="user-info">
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <div className="user-name">{user?.name}</div>
                <div className="user-email">{user?.email}</div>
              </div>
            </div>
          )}
          
          <button 
            className={`logout-btn ${sidebarCollapsed ? 'collapsed' : ''}`} 
            onClick={handleLogout} 
            title="Logout"
          >
            <LogOut size={18} />
            {!sidebarCollapsed && <Trans>Logout</Trans>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`dashboard-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Top Bar */}
        <div className="dashboard-topbar">
          <div className="topbar-left">
            <button 
              className="menu-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1 className="page-title">
              <Trans>{
                activeTab === 'stocks' ? 'Live Market' : 
                activeTab === 'portfolio' ? 'My Portfolio' :
                activeTab === 'watchlist' ? 'My Watchlist' :
                activeTab === 'news' ? 'News' : 
                activeTab === 'achievements' ? 'Achievements' :
                activeTab === 'predictions' ? 'AI Predictions' : 'Dashboard'
              }</Trans>
            </h1>
          </div>

          <div className="topbar-right">
            <LanguageSelector className="header-language-selector" />
            
            <div className="connection-status">
              <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                <div className="status-dot"></div>
                <Trans>{isConnected ? 'Live' : 'Offline'}</Trans>
              </div>
            </div>

            <div className="market-status">
              <Clock size={16} />
              <span className={`status ${
                stockData.marketStatus === 'LOADING' ? 'loading' :
                stockData.isMarketOpen ? 'open' : 'closed'
              }`}>
                <Trans>{
                  stockData.marketStatus === 'LOADING' ? 'Loading...' : 
                  stockData.marketStatus
                }</Trans>
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon wallet">
              <Wallet size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                <AnimatedPrice
                  value={user?.virtualBalance || 0}
                  previousValue={getPreviousValue('balance')}
                  currency={true}
                  decimals={0}
                  showArrow={false}
                  showChange={false}
                  size="large"
                  className="dashboard-stat"
                />
              </div>
              <div className="stat-label"><Trans>Available Balance</Trans></div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon invested">
              <Target size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                <AnimatedPrice
                  value={portfolioData?.summary?.totalInvested || user?.totalInvested || 0}
                  previousValue={getPreviousValue('invested')}
                  currency={true}
                  decimals={0}
                  showArrow={false}
                  showChange={false}
                  size="large"
                  className="dashboard-stat"
                />
              </div>
              <div className="stat-label"><Trans>Total Invested</Trans></div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon portfolio">
              <PieChart size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                <AnimatedPrice
                  value={portfolioData?.summary?.currentValue || user?.totalPortfolioValue || 0}
                  previousValue={getPreviousValue('portfolioValue')}
                  currency={true}
                  decimals={0}
                  showArrow={false}
                  showChange={false}
                  size="large"
                  className="dashboard-stat"
                />
              </div>
              <div className="stat-label"><Trans>Portfolio Value</Trans></div>
            </div>
          </div>

          <div className="stat-card">
            <div className={`stat-icon pnl ${(portfolioData?.summary?.totalProfitLoss || user?.totalProfitLoss || 0) >= 0 ? 'profit' : 'loss'}`}>
              {(portfolioData?.summary?.totalProfitLoss || user?.totalProfitLoss || 0) >= 0 ? 
                <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            <div className="stat-content">
              <div className={`stat-value ${(portfolioData?.summary?.totalProfitLoss || user?.totalProfitLoss || 0) >= 0 ? 'profit' : 'loss'}`}>
                <AnimatedPrice
                  value={portfolioData?.summary?.totalProfitLoss || user?.totalProfitLoss || 0}
                  previousValue={getPreviousValue('profitLoss')}
                  currency={true}
                  decimals={0}
                  showArrow={false}
                  showChange={false}
                  changeValue={portfolioData?.summary?.totalProfitLoss || user?.totalProfitLoss || 0}
                  size="large"
                  className="dashboard-stat"
                />
              </div>
              <div className="stat-label">
                <Trans>P&L</Trans> ({((portfolioData?.summary?.totalProfitLossPercent || user?.totalProfitLossPercent || 0)).toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>

        {/* Market Highlights */}
        {activeTab === 'stocks' && (
          <div className="market-highlights">
            <div className="highlight-section">
              <h3 className="section-title">
                <TrendingUp className="section-icon profit" />
                <span className="section-text"><Trans>Top Gainers</Trans></span>
              </h3>
              <div className="highlight-list">
                {topGainers.map((stock, index) => (
                  <div key={stock.instrumentKey} className="highlight-item">
                    <div className="highlight-info">
                      <div className="highlight-symbol">{stock.symbol}</div>
                      <div className="highlight-price">
                        <AnimatedPrice
                          value={stock.currentPrice}
                          previousValue={getPriceInfo(stock.instrumentKey).previousPrice}
                          currency={true}
                          decimals={2}
                          showArrow={false}
                          showChange={false}
                          size="medium"
                          className="highlight-animated-price"
                        />
                      </div>
                    </div>
                    <div className="highlight-change profit">
                      +{stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="highlight-section">
              <h3 className="section-title">
                <TrendingDown className="section-icon loss " />
                <span className="section-text"><Trans>Top Losers</Trans></span>
              </h3>
              <div className="highlight-list">
                {topLosers.map((stock, index) => (
                  <div key={stock.instrumentKey} className="highlight-item">
                    <div className="highlight-info">
                      <div className="highlight-symbol">{stock.symbol}</div>
                      <div className="highlight-price">
                        <AnimatedPrice
                          value={stock.currentPrice}
                          previousValue={getPriceInfo(stock.instrumentKey).previousPrice}
                          currency={true}
                          decimals={2}
                          showArrow={false}
                          showChange={false}
                          size="medium"
                          className="highlight-animated-price"
                        />
                      </div>
                    </div>
                    <div className="highlight-change loss">
                      {stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="dashboard-content">
          {activeTab === 'stocks' ? (
            <StockList onTrade={handleTrade} />
          ) : activeTab === 'portfolio' ? (
            <Portfolio 
              portfolioData={portfolioData} 
              onTrade={handleTrade} 
            />
          ) : activeTab === 'watchlist' ? (
            <Watchlist onTrade={handleTrade} />
          ) : activeTab === 'analysis' ? (
            <StockAnalysis />
          ) : activeTab === 'news' ? (
            <NewsSection />
          ) : activeTab === 'achievements' ? (
            <AchievementsList 
              userId={user?.id}
              showLeaderboard={true}
            />
          ) : activeTab === 'predictions' ? (
            <PredictionChallenge />
          ) : null}
        </div>
      </div>

      {/* Trading Modal */}
      {tradingModalOpen && (
        <TradingModal
          stock={selectedStock}
          action={tradingAction}
          onClose={() => setTradingModalOpen(false)}
          onSuccess={async () => {
            setTradingModalOpen(false);
            // Force refresh portfolio data
            try {
              const portfolioResponse = await axios.get('/api/trading/portfolio');
              setPortfolioData(portfolioResponse.data.data);
            } catch (error) {
              console.error('Failed to refresh portfolio:', error);
            }
          }}
        />
      )}

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ChatBot */}
      <ChatBot />

      {/* Achievement Notification */}
      <AchievementNotification
        achievement={achievementNotification}
        show={showAchievementNotification}
        onClose={handleCloseAchievementNotification}
      />
    </div>
  );
};

export default Dashboard;
