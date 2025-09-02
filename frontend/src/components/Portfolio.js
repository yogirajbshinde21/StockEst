import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AnimatedPrice from './AnimatedPrice';
import PortfolioIntelligence from './PortfolioIntelligence';
import Trans from './Trans';
import { usePriceTracker } from '../hooks/usePriceTracker';
import axios from 'axios';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  PieChart,
  RefreshCw,
  ShoppingCart,
  Minus,
  Activity,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import './Portfolio.css';

const Portfolio = ({ portfolioData, onTrade }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [localPortfolioData, setLocalPortfolioData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  
  const { user } = useAuth();
  
  // Extract stocks from portfolio for price tracking
  const portfolioStocks = localPortfolioData?.portfolio?.map(holding => ({
    instrumentKey: holding.instrumentKey,
    currentPrice: holding.currentPrice
  })) || [];
  
  const { getPriceInfo } = usePriceTracker(portfolioStocks, 'instrumentKey', 'currentPrice');

  // Fetch portfolio data
  useEffect(() => {
    fetchPortfolioData();
    fetchTransactions();
  }, []);

  // Update local data when socket data changes
  useEffect(() => {
    if (portfolioData) {
      setLocalPortfolioData(portfolioData);
    }
  }, [portfolioData]);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/trading/portfolio');
      setLocalPortfolioData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch portfolio');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get('/api/trading/transactions?limit=10');
      setTransactions(response.data.data.transactions);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (percent) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const currentData = localPortfolioData || {
    portfolio: [],
    summary: {
      totalInvested: 0,
      currentValue: 0,
      totalProfitLoss: 0,
      totalProfitLossPercent: 0,
      cashBalance: user?.virtualBalance || 0,
      totalBalance: user?.virtualBalance || 0
    }
  };

  if (loading && !localPortfolioData) {
    return (
      <div className="portfolio-loading">
        <div className="loading-spinner">
          <RefreshCw className="spin" size={32} />
        </div>
        <p><Trans>Loading your portfolio...</Trans></p>
      </div>
    );
  }

  if (error && !localPortfolioData) {
    return (
      <div className="portfolio-error">
        <AlertCircle size={48} />
        <h3><Trans>Failed to load portfolio</Trans></h3>
        <p>{error}</p>
        <button onClick={fetchPortfolioData} className="retry-btn">
          <RefreshCw size={16} />
          <Trans>Try Again</Trans>
        </button>
      </div>
    );
  }

  return (
    <div className="portfolio">
      {/* Portfolio Navigation */}
      <div className="portfolio-nav">
        <button 
          className={`nav-tab ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          <PieChart size={18} />
          <Trans>Portfolio Overview</Trans>
        </button>
        <button 
          className={`nav-tab ${activeView === 'intelligence' ? 'active' : ''}`}
          onClick={() => setActiveView('intelligence')}
        >
          <BarChart3 size={18} />
          <Trans>Intelligence Dashboard</Trans>
        </button>
      </div>

      {/* Content based on active view */}
      {activeView === 'intelligence' ? (
        <PortfolioIntelligence />
      ) : (
        <>
          {/* Portfolio Summary */}
          <div className="portfolio-summary">
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-icon cash">
              <DollarSign size={24} />
            </div>
            <div className="card-content">
              <div className="card-value">{formatCurrency(currentData.summary.cashBalance)}</div>
              <div className="card-label"><Trans>Cash Balance</Trans></div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon invested">
              <PieChart size={24} />
            </div>
            <div className="card-content">
              <div className="card-value">{formatCurrency(currentData.summary.totalInvested)}</div>
              <div className="card-label"><Trans>Total Invested</Trans></div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon current">
              <Activity size={24} />
            </div>
            <div className="card-content">
              <div className="card-value">{formatCurrency(currentData.summary.currentValue)}</div>
              <div className="card-label"><Trans>Current Value</Trans></div>
            </div>
          </div>

          <div className="summary-card">
            <div className={`card-icon pnl ${currentData.summary.totalProfitLoss >= 0 ? 'profit' : 'loss'}`}>
              {currentData.summary.totalProfitLoss >= 0 ? 
                <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            <div className="card-content">
              <div className={`card-value ${currentData.summary.totalProfitLoss >= 0 ? 'profit' : 'loss'}`}>
                {formatCurrency(currentData.summary.totalProfitLoss)}
              </div>
              <div className="card-label">
                <Trans>Total P&L</Trans> ({formatPercent(currentData.summary.totalProfitLossPercent)})
              </div>
            </div>
          </div>
        </div>

        <div className="portfolio-allocation">
          <h3><Trans>Portfolio Allocation</Trans></h3>
          <div className="allocation-chart">
            <div className="cash-allocation">
              <div className="allocation-bar">
                <div 
                  className="cash-bar"
                  style={{ 
                    width: `${(currentData.summary.cashBalance / currentData.summary.totalBalance) * 100}%` 
                  }}
                ></div>
                <div 
                  className="invested-bar"
                  style={{ 
                    width: `${(currentData.summary.currentValue / currentData.summary.totalBalance) * 100}%` 
                  }}
                ></div>
              </div>
              <div className="allocation-labels">
                <div className="label-item">
                  <div className="label-color cash"></div>
                  <span><Trans>Cash</Trans> ({((currentData.summary.cashBalance / currentData.summary.totalBalance) * 100).toFixed(1)}%)</span>
                </div>
                <div className="label-item">
                  <div className="label-color invested"></div>
                  <span><Trans>Invested</Trans> ({((currentData.summary.currentValue / currentData.summary.totalBalance) * 100).toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="portfolio-holdings">
        <div className="holdings-header">
          <h3><Trans>Your Holdings</Trans></h3>
          <div className="header-actions">
            <button 
              onClick={fetchPortfolioData} 
              className="refresh-btn"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              <Trans>Refresh</Trans>
            </button>
          </div>
        </div>

        {currentData.portfolio.length === 0 ? (
          <div className="no-holdings">
            <div className="no-holdings-icon">
              <PieChart size={64} />
            </div>
            <h3><Trans>No holdings yet</Trans></h3>
            <p><Trans>Start trading to build your portfolio</Trans></p>
            <button 
              onClick={() => setShowTransactions(true)}
              className="view-market-btn"
            >
              <Trans>View Market</Trans>
            </button>
          </div>
        ) : (
          <div className="holdings-table">
            <div className="table-header">
              <div className="header-cell"><Trans>Stock</Trans></div>
              <div className="header-cell"><Trans>Quantity</Trans></div>
              <div className="header-cell"><Trans>Avg Price</Trans></div>
              <div className="header-cell"><Trans>Current Price</Trans></div>
              <div className="header-cell"><Trans>Investment</Trans></div>
              <div className="header-cell"><Trans>Current Value</Trans></div>
              <div className="header-cell"><Trans>P&L</Trans></div>
              <div className="header-cell"><Trans>Actions</Trans></div>
            </div>

            <div className="table-body">
              {currentData.portfolio.map((holding) => (
                <div key={holding.instrumentKey} className="table-row">
                  <div className="table-cell stock-cell">
                    <div className="stock-info">
                      <div className="stock-symbol">{holding.symbol}</div>
                      <div className="stock-name">{holding.companyName}</div>
                    </div>
                  </div>

                  <div className="table-cell quantity-cell">
                    <div className="quantity">{holding.quantity}</div>
                  </div>

                  <div className="table-cell price-cell">
                    <div className="price">{formatCurrency(holding.averagePrice)}</div>
                  </div>

                  <div className="table-cell price-cell">
                    <AnimatedPrice
                      value={holding.currentPrice}
                      previousValue={getPriceInfo(holding.instrumentKey).previousPrice}
                      currency={true}
                      decimals={2}
                      showArrow={false}
                      showChange={false}
                      size="medium"
                      className="portfolio-price"
                    />
                  </div>

                  <div className="table-cell investment-cell">
                    <div className="investment">{formatCurrency(holding.totalInvested)}</div>
                  </div>

                  <div className="table-cell value-cell">
                    <div className="current-value">{formatCurrency(holding.currentValue)}</div>
                  </div>

                  <div className="table-cell pnl-cell">
                    <div className={`pnl ${holding.profitLoss >= 0 ? 'profit' : 'loss'}`}>
                      <div className="pnl-amount">{formatCurrency(holding.profitLoss)}</div>
                      <div className="pnl-percent">({formatPercent(holding.profitLossPercent)})</div>
                    </div>
                  </div>

                  <div className="table-cell actions-cell">
                    <div className="action-buttons">
                      <button
                        className="buy-btn"
                        onClick={() => onTrade(holding, 'BUY')}
                        title={`Buy more ${holding.symbol}`}
                      >
                        <ShoppingCart size={14} />
                      </button>
                      <button
                        className="sell-btn"
                        onClick={() => onTrade(holding, 'SELL')}
                        title={`Sell ${holding.symbol}`}
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="recent-transactions">
        <div className="transactions-header">
          <h3><Trans>Recent Transactions</Trans></h3>
          <button 
            onClick={() => setShowTransactions(!showTransactions)}
            className="toggle-transactions-btn"
          >
            <Trans>{showTransactions ? 'Hide' : 'Show'}</Trans> <Trans>Transactions</Trans>
          </button>
        </div>

        {showTransactions && (
          <div className="transactions-list">
            {transactions.length === 0 ? (
              <div className="no-transactions">
                <p><Trans>No transactions yet</Trans></p>
              </div>
            ) : (
              <div className="transactions-table">
                <div className="table-header">
                  <div className="header-cell"><Trans>Date</Trans></div>
                  <div className="header-cell"><Trans>Type</Trans></div>
                  <div className="header-cell"><Trans>Stock</Trans></div>
                  <div className="header-cell"><Trans>Quantity</Trans></div>
                  <div className="header-cell"><Trans>Price</Trans></div>
                  <div className="header-cell"><Trans>Amount</Trans></div>
                  <div className="header-cell"><Trans>P&L</Trans></div>
                </div>
                
                <div className="table-body">
                  {transactions.map((transaction, index) => (
                    <div key={index} className="table-row">
                      <div className="table-cell date-cell">
                        {new Date(transaction.timestamp).toLocaleDateString()}
                      </div>
                      <div className="table-cell type-cell">
                        <span className={`transaction-type ${transaction.type.toLowerCase()}`}>
                          {transaction.type}
                        </span>
                      </div>
                      <div className="table-cell stock-cell">
                        <div className="stock-info">
                          <div className="symbol">{transaction.symbol}</div>
                        </div>
                      </div>
                      <div className="table-cell quantity-cell">
                        {transaction.quantity}
                      </div>
                      <div className="table-cell price-cell">
                        {formatCurrency(transaction.price)}
                      </div>
                      <div className="table-cell amount-cell">
                        {formatCurrency(transaction.totalAmount)}
                      </div>
                      <div className="table-cell pnl-cell">
                        {transaction.type === 'SELL' && transaction.profitLoss !== undefined ? (
                          <div className={`pnl ${transaction.profitLoss >= 0 ? 'profit' : 'loss'}`}>
                            <div className="pnl-amount">
                              {transaction.profitLoss >= 0 ? '+' : ''}{formatCurrency(transaction.profitLoss)}
                            </div>
                            <div className="pnl-percent">
                              ({transaction.profitLossPercent >= 0 ? '+' : ''}{transaction.profitLossPercent?.toFixed(2)}%)
                            </div>
                          </div>
                        ) : (
                          <span className="na-text">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};

export default Portfolio;
