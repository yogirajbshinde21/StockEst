import React, { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import AnimatedPrice from './AnimatedPrice';
import { usePriceTracker } from '../hooks/usePriceTracker';
import Trans from './Trans';
import toast from 'react-hot-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  RefreshCw,
  ShoppingCart,
  Minus,
  Heart,
  HeartOff
} from 'lucide-react';
import './StockList.css';

const StockList = ({ onTrade }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('symbol');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [watchlist, setWatchlist] = useState([]);

  const { stockData, refreshStockData, isConnected } = useSocket();
  const { token } = useAuth();
  const { getPriceInfo } = usePriceTracker(stockData?.stocks || [], 'instrumentKey', 'currentPrice');

  // Fetch user's watchlist on mount
  useEffect(() => {
    fetchWatchlist();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchWatchlist = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/watchlist', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setWatchlist(result.data.watchlist || []);
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    }
  };

  const isInWatchlist = (instrumentKey) => {
    return watchlist.some(item => item.instrumentKey === instrumentKey);
  };

  const addToWatchlist = async (stock) => {
    try {
      const response = await fetch('http://localhost:5000/api/watchlist/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instrumentKey: stock.instrumentKey,
          symbol: stock.symbol,
          companyName: stock.companyName
        })
      });

      if (response.ok) {
        const result = await response.json();
        setWatchlist(prev => [...prev, result.data.watchlistItem]);
        toast.success(`${stock.symbol} added to watchlist`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add to watchlist');
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      toast.error('Error adding to watchlist');
    }
  };

  const removeFromWatchlist = async (instrumentKey, symbol) => {
    try {
      const response = await fetch(`http://localhost:5000/api/watchlist/remove/${instrumentKey}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setWatchlist(prev => prev.filter(item => item.instrumentKey !== instrumentKey));
        toast.success(`${symbol} removed from watchlist`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to remove from watchlist');
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      toast.error('Error removing from watchlist');
    }
  };

  const handleWatchlistToggle = (stock) => {
    if (isInWatchlist(stock.instrumentKey)) {
      removeFromWatchlist(stock.instrumentKey, stock.symbol);
    } else {
      addToWatchlist(stock);
    }
  };

  // Filter and sort stocks
  const filteredAndSortedStocks = useMemo(() => {
    let filtered = stockData.stocks.filter(stock =>
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort stocks
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle different data types
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [stockData.stocks, searchTerm, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshStockData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatChange = (change) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  };

  return (
    <div className="stock-list">
      {/* Header Controls */}
      <div className="stock-list-header">
        <div className="search-container">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search stocks by name or symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="header-actions">
          <button 
            className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
            onClick={handleRefresh}
            disabled={!isConnected || isRefreshing}
            title="Refresh stock prices"
          >
            <RefreshCw size={18} />
            <Trans>Refresh</Trans>
          </button>

          <div className="sort-controls">
            <label htmlFor="sort-select">Sort by:</label>
            <select
              id="sort-select"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="sort-select"
            >
              <option value="symbol-asc">Symbol A-Z</option>
              <option value="symbol-desc">Symbol Z-A</option>
              <option value="companyName-asc">Company A-Z</option>
              <option value="companyName-desc">Company Z-A</option>
              <option value="currentPrice-desc">Price High-Low</option>
              <option value="currentPrice-asc">Price Low-High</option>
              <option value="changePercent-desc">Gainers First</option>
              <option value="changePercent-asc">Losers First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Market Status Banner */}
      {!stockData.isMarketOpen && stockData.marketStatus !== 'LOADING' && (
        <div className="market-status-banner">
          <div className="banner-content">
            <div className="banner-icon">
              <TrendingDown size={20} />
            </div>
            <div className="banner-text">
              <strong>Market is currently {stockData.marketStatus.toLowerCase()}</strong>
              <span>Prices shown are from the last trading session</span>
            </div>
          </div>
        </div>
      )}

      {/* Stock Table */}
      <div className="stock-table-container">
        {stockData.marketStatus === 'LOADING' ? (
          <div className="loading-stocks">
            <div className="loading-icon">
              <RefreshCw size={48} className="spin" />
            </div>
            <h3>Loading market data...</h3>
            <p>Please wait while we fetch the latest stock prices</p>
          </div>
        ) : filteredAndSortedStocks.length === 0 ? (
          <div className="no-stocks">
            <div className="no-stocks-icon">
              <Search size={48} />
            </div>
            <h3>No stocks found</h3>
            <p>Try adjusting your search terms or check your connection</p>
          </div>
        ) : (
          <div className="stock-table">
            {/* Table Header */}
            <div className="table-header">
              <div 
                className="header-cell symbol-cell"
                onClick={() => handleSort('symbol')}
              >
                <span>Symbol</span>
                {sortBy === 'symbol' && (
                  <span className={`sort-arrow ${sortOrder}`}>
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
              <div 
                className="header-cell company-cell"
                onClick={() => handleSort('companyName')}
              >
                <span>Company</span>
                {sortBy === 'companyName' && (
                  <span className={`sort-arrow ${sortOrder}`}>
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
              <div 
                className="header-cell price-cell"
                onClick={() => handleSort('currentPrice')}
              >
                <span>Price</span>
                {sortBy === 'currentPrice' && (
                  <span className={`sort-arrow ${sortOrder}`}>
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
              <div 
                className="header-cell change-cell"
                onClick={() => handleSort('change')}
              >
                <span>Change</span>
                {sortBy === 'change' && (
                  <span className={`sort-arrow ${sortOrder}`}>
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
              <div 
                className="header-cell percent-cell"
                onClick={() => handleSort('changePercent')}
              >
                <span>Change %</span>
                {sortBy === 'changePercent' && (
                  <span className={`sort-arrow ${sortOrder}`}>
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
              <div className="header-cell actions-cell">
                <span>Actions</span>
              </div>
            </div>

            {/* Table Body */}
            <div className="table-body">
              {filteredAndSortedStocks.map((stock) => (
                <div key={stock.instrumentKey} className="table-row">
                  <div className="table-cell symbol-cell">
                    <div className="symbol-info">
                      <div className="symbol">{stock.symbol}</div>
                      <div className="exchange">NSE</div>
                    </div>
                  </div>

                  <div className="table-cell company-cell">
                    <div className="company-name" title={stock.companyName}>
                      {stock.companyName}
                    </div>
                  </div>

                  <div className="table-cell price-cell">
                    <AnimatedPrice
                      value={stock.currentPrice}
                      previousValue={getPriceInfo(stock.instrumentKey).previousPrice}
                      currency={true}
                      decimals={2}
                      showArrow={false}
                      showChange={false}
                      size="medium"
                      className="stock-list-price"
                    />
                  </div>

                  <div className="table-cell change-cell">
                    <div className={`change-value ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                      {stock.change >= 0 ? (
                        <TrendingUp size={16} />
                      ) : (
                        <TrendingDown size={16} />
                      )}
                      <span>{formatChange(stock.change)}</span>
                    </div>
                  </div>

                  <div className="table-cell percent-cell">
                    <div className={`percent-value ${stock.changePercent >= 0 ? 'positive' : 'negative'}`}>
                      {formatChange(stock.changePercent)}%
                    </div>
                  </div>

                  <div className="table-cell actions-cell">
                    <div className="action-buttons">
                      <button
                        className={`watchlist-btn ${isInWatchlist(stock.instrumentKey) ? 'in-watchlist' : ''}`}
                        onClick={() => handleWatchlistToggle(stock)}
                        title={isInWatchlist(stock.instrumentKey) ? 'Remove from watchlist' : 'Add to watchlist'}
                      >
                        {isInWatchlist(stock.instrumentKey) ? (
                          <Heart size={16} />
                        ) : (
                          <HeartOff size={16} />
                        )}
                      </button>
                      <button
                        className="buy-btn"
                        onClick={() => onTrade(stock, 'BUY')}
                        title={`Buy ${stock.symbol}`}
                      >
                        <ShoppingCart size={16} />
                        <span>Buy</span>
                      </button>
                      <button
                        className="sell-btn"
                        onClick={() => onTrade(stock, 'SELL')}
                        title={`Sell ${stock.symbol}`}
                      >
                        <Minus size={16} />
                        <span>Sell</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="stock-list-footer">
        <div className="footer-info">
          <span>Showing {filteredAndSortedStocks.length} of {stockData.stocks.length} stocks</span>
          {stockData.lastUpdated && (
            <span>
              Last updated: {new Date(stockData.lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {!isConnected && (
          <div className="connection-warning">
            <span>⚠️ Not connected to live data</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockList;
