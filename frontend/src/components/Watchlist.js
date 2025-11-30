import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_BASE_URL } from '../config/api';
import AnimatedPrice from './AnimatedPrice';
import { usePriceTracker } from '../hooks/usePriceTracker';
import Trans from './Trans';
import toast from 'react-hot-toast';
import { 
  Heart, 
  HeartOff, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart,
  Bell,
  BellOff,
  AlertCircle,
  Target
} from 'lucide-react';
import './Watchlist.css';

const Watchlist = ({ onTrade }) => {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [alertPrice, setAlertPrice] = useState('');

  const { token } = useAuth();
  const { stockData } = useSocket();
  const { getPriceInfo } = usePriceTracker(stockData?.stocks || [], 'instrumentKey', 'currentPrice');

  // Fetch watchlist on component mount
  useEffect(() => {
    fetchWatchlist();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update prices when stockData changes
  useEffect(() => {
    updateWatchlistPrices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockData]);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/watchlist`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setWatchlist(result.data.watchlist || []);
      } else {
        console.error('Failed to fetch watchlist');
        toast.error('Failed to load watchlist');
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      toast.error('Error loading watchlist');
    } finally {
      setLoading(false);
    }
  };

  const updateWatchlistPrices = () => {
    if (!stockData.stocks || watchlist.length === 0) return;

    const updatedWatchlist = watchlist.map(item => {
      const liveStock = stockData.stocks.find(s => s.instrumentKey === item.instrumentKey);
      if (liveStock) {
        return {
          ...item,
          currentPrice: liveStock.currentPrice,
          change: liveStock.change,
          changePercent: liveStock.changePercent
        };
      }
      return item;
    });

    setWatchlist(updatedWatchlist);
  };

  const removeFromWatchlist = async (instrumentKey) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlist/remove/${instrumentKey}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setWatchlist(prev => prev.filter(item => item.instrumentKey !== instrumentKey));
        toast.success('Stock removed from watchlist');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to remove stock');
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      toast.error('Error removing stock from watchlist');
    }
  };

  const handleQuickBuy = (stock) => {
    if (onTrade) {
      onTrade(stock, 'BUY');
    }
  };

  const handleSetAlert = (stock) => {
    setSelectedStock(stock);
    setAlertPrice(stock.alertPrice || '');
    setShowAlertModal(true);
  };

  const saveAlert = async () => {
    if (!selectedStock || !alertPrice) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlist/alert/${selectedStock.instrumentKey}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alertPrice: parseFloat(alertPrice),
          alertEnabled: true
        })
      });

      if (response.ok) {
        // Update local state
        setWatchlist(prev => prev.map(item => 
          item.instrumentKey === selectedStock.instrumentKey 
            ? { ...item, alertPrice: parseFloat(alertPrice), alertEnabled: true }
            : item
        ));
        
        toast.success(`Alert set for ${selectedStock.symbol} at ₹${alertPrice}`);
        setShowAlertModal(false);
        setAlertPrice('');
        setSelectedStock(null);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to set alert');
      }
    } catch (error) {
      console.error('Error setting alert:', error);
      toast.error('Error setting price alert');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="watchlist-loading">
        <div className="loading-spinner">
          <Heart className="spin" size={32} />
        </div>
        <p>Loading your watchlist...</p>
      </div>
    );
  }

  return (
    <div className="watchlist">
      <div className="watchlist-header">
        <div className="header-left">
          <h3>
            <Heart size={20} />
            <Trans>My Watchlist</Trans>
          </h3>
          <span className="watchlist-count">{watchlist.length} stocks</span>
        </div>
      </div>

      {watchlist.length === 0 ? (
        <div className="empty-watchlist">
          <div className="empty-icon">
            <Heart size={48} />
          </div>
          <h3>Your watchlist is empty</h3>
          <p>Add stocks you're interested in to track their performance</p>
          <div className="empty-tip">
            <AlertCircle size={16} />
            <span>Tip: Click the heart icon on any stock to add it here</span>
          </div>
        </div>
      ) : (
        <div className="watchlist-grid">
          {watchlist.map((stock) => {
            const isTargetReached = stock.alertEnabled && stock.alertPrice && 
              stock.currentPrice && stock.currentPrice >= stock.alertPrice;
            
            return (
              <div key={stock.instrumentKey} className="watchlist-card">
                <div className="card-header">
                  <div className="stock-info">
                    <div className="stock-symbol">{stock.symbol}</div>
                    <div className="stock-name">{stock.companyName}</div>
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => removeFromWatchlist(stock.instrumentKey)}
                    title="Remove from watchlist"
                  >
                    <HeartOff size={16} />
                  </button>
                </div>

                <div className="price-section">
                  <div className="current-price">
                    <AnimatedPrice
                      value={stock.currentPrice || 0}
                      previousValue={getPriceInfo(stock.instrumentKey).previousPrice}
                      currency={true}
                      decimals={2}
                      showArrow={false}
                      showChange={true}
                      changeValue={stock.change || 0}
                      changePercent={stock.changePercent || 0}
                      size="medium"
                      className="watchlist-price"
                    />
                  </div>
                </div>

                {stock.alertEnabled && stock.alertPrice && (
                  <div className={`alert-section ${isTargetReached ? 'alert-reached' : ''}`}>
                    <div className="alert-info">
                      <Target size={14} />
                      <span>Alert: {formatCurrency(stock.alertPrice)}</span>
                    </div>
                    {isTargetReached && (
                      <div className="alert-reached-text">
                        🎯 Target reached!
                      </div>
                    )}
                  </div>
                )}

                <div className="card-actions">
                  <button
                    className="quick-buy-btn"
                    onClick={() => handleQuickBuy(stock)}
                  >
                    <ShoppingCart size={16} />
                    <Trans>Quick Buy</Trans>
                  </button>
                  <button
                    className="alert-btn"
                    onClick={() => handleSetAlert(stock)}
                    title="Set price alert"
                  >
                    {stock.alertEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && selectedStock && (
        <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
          <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Set Price Alert</h3>
              <button 
                className="close-btn"
                onClick={() => setShowAlertModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="stock-info">
                <div className="symbol">{selectedStock.symbol}</div>
                <div className="current">Current: {formatCurrency(selectedStock.currentPrice || 0)}</div>
              </div>
              
              <div className="alert-input">
                <label>Alert me when price reaches:</label>
                <input
                  type="number"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  placeholder="Enter target price"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowAlertModal(false)}
              >
                Cancel
              </button>
              <button 
                className="save-btn"
                onClick={saveAlert}
                disabled={!alertPrice}
              >
                Set Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
