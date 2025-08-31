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
  BarChart3
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('stocks');
  const [tradingModalOpen, setTradingModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [tradingAction, setTradingAction] = useState('BUY');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  

  const topGainers = getTopGainers(3);
  const topLosers = getTopLosers(3);

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <div className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <TrendingUp className="brand-icon" />
            <Trans>Stock Simulator</Trans>
          </div>
          <button 
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'stocks' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('stocks');
              setSidebarOpen(false);
            }}
          >
            <Activity size={20} />
            <Trans>Market</Trans>
          </button>
          
          <button
            className={`nav-item ${activeTab === 'portfolio' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('portfolio');
              setSidebarOpen(false);
            }}
          >
            <PieChart size={20} />
            <Trans>Portfolio</Trans>
          </button>

          <button
            className={`nav-item ${activeTab === 'watchlist' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('watchlist');
              setSidebarOpen(false);
            }}
          >
            <Heart size={20} />
            <Trans>Watchlist</Trans>
          </button>

          <button
            className={`nav-item ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('analysis');
              setSidebarOpen(false);
            }}
          >
            <BarChart3 size={20} />
            <Trans>Analysis</Trans>
          </button>

          <button
            className={`nav-item ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('news');
              setSidebarOpen(false);
            }}
          >
            <Newspaper size={20} />
            <Trans>News</Trans>
          </button>

          <button
            className={`nav-item ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('achievements');
              setSidebarOpen(false);
            }}
          >
            <Trophy size={20} />
            <Trans>Leaderboard</Trans>
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <Trans>Logout</Trans>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
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
                activeTab === 'achievements' ? 'Achievements' : 'Dashboard'
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
              <div className="stat-value">{formatCurrency(user?.virtualBalance || 0)}</div>
              <div className="stat-label"><Trans>Available Balance</Trans></div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon invested">
              <Target size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{formatCurrency(portfolioData?.summary?.totalInvested || user?.totalInvested || 0)}</div>
              <div className="stat-label"><Trans>Total Invested</Trans></div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon portfolio">
              <PieChart size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{formatCurrency(portfolioData?.summary?.currentValue || user?.totalPortfolioValue || 0)}</div>
              <div className="stat-label">Portfolio Value</div>
            </div>
          </div>

          <div className="stat-card">
            <div className={`stat-icon pnl ${(portfolioData?.summary?.totalProfitLoss || user?.totalProfitLoss || 0) >= 0 ? 'profit' : 'loss'}`}>
              {(portfolioData?.summary?.totalProfitLoss || user?.totalProfitLoss || 0) >= 0 ? 
                <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            <div className="stat-content">
              <div className={`stat-value ${(portfolioData?.summary?.totalProfitLoss || user?.totalProfitLoss || 0) >= 0 ? 'profit' : 'loss'}`}>
                {formatCurrency(portfolioData?.summary?.totalProfitLoss || user?.totalProfitLoss || 0)}
              </div>
              <div className="stat-label">
                P&L ({((portfolioData?.summary?.totalProfitLossPercent || user?.totalProfitLossPercent || 0)).toFixed(2)}%)
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
                <span className="section-text">Top Gainers</span>
              </h3>
              <div className="highlight-list">
                {topGainers.map((stock, index) => (
                  <div key={stock.instrumentKey} className="highlight-item">
                    <div className="highlight-info">
                      <div className="highlight-symbol">{stock.symbol}</div>
                      <div className="highlight-price">₹{stock.currentPrice.toFixed(2)}</div>
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
                <span className="section-text">Top Losers</span>
              </h3>
              <div className="highlight-list">
                {topLosers.map((stock, index) => (
                  <div key={stock.instrumentKey} className="highlight-item">
                    <div className="highlight-info">
                      <div className="highlight-symbol">{stock.symbol}</div>
                      <div className="highlight-price">₹{stock.currentPrice.toFixed(2)}</div>
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
