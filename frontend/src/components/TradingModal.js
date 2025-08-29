import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Trans from './Trans';
import { 
  X, 
  ShoppingCart, 
  Minus, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Calculator
} from 'lucide-react';
import toast from 'react-hot-toast';
import './TradingModal.css';

const TradingModal = ({ stock, action, onClose, onSuccess }) => {
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [orderType, setOrderType] = useState('MARKET');
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState(null);
  const [orderPreview, setOrderPreview] = useState(null);
  const [userHolding, setUserHolding] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saleCalculation, setSaleCalculation] = useState(null);

  const { user, updateUserData } = useAuth();

  useEffect(() => {
    if (stock) {
      // Set price safely with fallback
      const currentPrice = stock.currentPrice || 0;
      setPrice(currentPrice.toFixed(2));
      
      // Find user's holding for this stock
      const holding = user?.portfolio?.find(item => item.instrumentKey === stock.instrumentKey);
      setUserHolding(holding);
    }
  }, [stock, user]);

  const calculateOrderPreview = useCallback(() => {
    const qty = parseInt(quantity);
    const prc = parseFloat(price);
    
    if (qty > 0 && prc > 0) {
      const totalAmount = qty * prc;
      
      // For sell orders, calculate profit/loss details
      if (action === 'SELL' && userHolding) {
        const avgCostForSoldShares = userHolding.averagePrice * qty;
        const profitLossOnSale = totalAmount - avgCostForSoldShares;
        const profitLossPercent = avgCostForSoldShares > 0 ? ((profitLossOnSale / avgCostForSoldShares) * 100) : 0;
        const newBalance = (user?.virtualBalance || 0) + totalAmount;
        const isCompletelySellingOut = qty === userHolding.quantity;
        
        setSaleCalculation({
          originalInvestment: avgCostForSoldShares,
          saleAmount: totalAmount,
          profitLoss: profitLossOnSale,
          profitLossPercent: profitLossPercent,
          newBalance: newBalance,
          isCompletelySellingOut: isCompletelySellingOut,
          remainingShares: userHolding.quantity - qty
        });
      }
      
      setOrderPreview({
        quantity: qty,
        price: prc,
        totalAmount,
        estimatedCharges: 0, // Virtual trading has no charges
        netAmount: totalAmount
      });
    }
  }, [quantity, price, action, userHolding, user?.virtualBalance]);

  useEffect(() => {
    if (quantity && price) {
      calculateOrderPreview();
    } else {
      setOrderPreview(null);
      setSaleCalculation(null);
    }
  }, [calculateOrderPreview, quantity, price]);

  const validateOrder = async () => {
    try {
      const response = await axios.post('/api/trading/validate-order', {
        type: action,
        instrumentKey: stock.instrumentKey,
        quantity: parseInt(quantity),
        price: parseFloat(price)
      });

      setValidation(response.data.data.validation);
      return response.data.data.validation.valid;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Validation failed';
      setValidation({
        valid: false,
        errors: [errorMessage],
        warnings: []
      });
      return false;
    }
  };

  // Frontend validation before showing confirmation modal
  const validateBeforeConfirmation = () => {
    if (action === 'SELL') {
      // Check if user owns the stock
      if (!userHolding) {
        toast.error(`❌ You don't own any ${stock.symbol} shares to sell!`, {
          duration: 6000,
          style: {
            background: '#fee2e2',
            color: '#dc2626',
            border: '1px solid #ef4444',
          }
        });
        return false;
      }

      // Check if trying to sell more than owned
      if (userHolding && parseInt(quantity) > userHolding.quantity) {
        toast.error(`❌ You only own ${userHolding.quantity} ${stock.symbol} share${userHolding.quantity > 1 ? 's' : ''}, but trying to sell ${quantity}!`, {
          duration: 6000,
          style: {
            background: '#fee2e2',
            color: '#dc2626',
            border: '1px solid #ef4444',
          }
        });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!quantity || !price) {
      toast.error('Please enter quantity and price');
      return;
    }

    // For sell orders, validate before showing confirmation modal
    if (action === 'SELL' && !showConfirmation) {
      // Frontend validation first
      if (!validateBeforeConfirmation()) {
        return;
      }
      setShowConfirmation(true);
      return;
    }

    setLoading(true);
    
    try {
      // Validate order first (backend validation)
      const isValid = await validateOrder();
      
      if (!isValid) {
        setLoading(false);
        return;
      }

      // Execute order
      const endpoint = action === 'BUY' ? '/api/trading/buy' : '/api/trading/sell';
      const response = await axios.post(endpoint, {
        instrumentKey: stock.instrumentKey,
        quantity: parseInt(quantity),
        price: parseFloat(price)
      });

      // Show detailed success message for sell orders
      if (action === 'SELL') {
        const { profitLossOnSale, newBalance, educationalNote } = response.data.data;
        const profitLossText = profitLossOnSale >= 0 ? `Profit: +₹${profitLossOnSale.toFixed(2)}` : `Loss: -₹${Math.abs(profitLossOnSale).toFixed(2)}`;
        const successMessage = `✅ Sale Successful! Sold ${quantity} ${stock.symbol} share${quantity > 1 ? 's' : ''} at ₹${parseFloat(price).toFixed(2)}, Realized ${profitLossText}, New Balance: ₹${newBalance.toFixed(2)}`;
        
        // Show success toast
        toast.success(successMessage, { duration: 8000 });
        
        // Show educational note
        if (educationalNote) {
          setTimeout(() => {
            toast(educationalNote, { 
              duration: 5000,
              icon: '📚',
              style: {
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fbbf24',
              }
            });
          }, 1000);
        }
      } else {
        toast.success(response.data.message);
      }

      // Update user data
      updateUserData({
        virtualBalance: response.data.data.newBalance,
        totalPortfolioValue: response.data.data.portfolioValue
      });

      // Check for achievements after successful trade
      try {
        const achievementResponse = await axios.post('/api/achievements/check', {
          action: 'trade_completed',
          tradeData: {
            type: action,
            symbol: stock.symbol,
            quantity: parseInt(quantity),
            price: parseFloat(price),
            totalAmount: parseInt(quantity) * parseFloat(price)
          }
        });

        if (achievementResponse.data.success && achievementResponse.data.data.newAchievements.length > 0) {
          // Dispatch achievement events for notifications
          achievementResponse.data.data.newAchievements.forEach(achievement => {
            const achievementEvent = new CustomEvent('achievementUnlocked', {
              detail: { achievement }
            });
            window.dispatchEvent(achievementEvent);
          });
        }
      } catch (achievementError) {
        console.error('Achievement check failed:', achievementError);
        // Don't fail the trade if achievement check fails
      }

      onSuccess();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Order failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const handleMaxQuantity = () => {
    if (action === 'BUY') {
      // Calculate max quantity based on available balance
      const maxQty = Math.floor(user.virtualBalance / parseFloat(price || stock.currentPrice));
      setQuantity(maxQty.toString());
    } else if (action === 'SELL' && userHolding) {
      // Set to max holding quantity
      setQuantity(userHolding.quantity.toString());
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (!stock) return null;

  return (
    <div className="trading-modal-overlay" onClick={onClose}>
      <div className="trading-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="header-content">
            <div className={`action-icon ${action.toLowerCase()}`}>
              {action === 'BUY' ? <ShoppingCart size={24} /> : <Minus size={24} />}
            </div>
            <div className="header-text">
              <h2><Trans>{action}</Trans> {stock.symbol}</h2>
              <p><Trans>{stock.companyName}</Trans></p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Warning Banner for Sell without Holdings */}
        {action === 'SELL' && !userHolding && (
          <div className="warning-banner">
            <AlertCircle size={20} />
            <div className="warning-content">
              <strong><Trans>Cannot Sell Stock</Trans></strong>
              <p><Trans>You don't own any {stock.symbol} shares in your portfolio. You can only sell stocks that you have purchased.</Trans></p>
            </div>
          </div>
        )}

        {/* Stock Info */}
        <div className="stock-info-card">
          <div className="stock-details">
            <div className="current-price">
              <span className="label"><Trans>Current Price</Trans></span>
              <span className="value">{formatCurrency(stock.currentPrice || 0)}</span>
            </div>
            {(stock.change !== undefined && stock.changePercent !== undefined) && (
              <div className={`price-change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                {stock.change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)</span>
              </div>
            )}
          </div>

          {/* User Holdings Info */}
          {action === 'SELL' && (
            <div className={`holding-info ${!userHolding ? 'no-holdings-warning' : ''}`}>
              <span className="label"><Trans></Trans></span>
              <span className="value">
                {userHolding ? (
                  `${userHolding.quantity} share${userHolding.quantity > 1 ? 's' : ''}`
                ) : (
                  <span className="no-holdings-text">
                    ❌ <Trans>No holdings - Cannot sell</Trans>
                  </span>
                )}
              </span>
            </div>
          )}

          <div className="balance-info">
            <span className="label"><Trans>Available Balance</Trans></span>
            <span className="value">{formatCurrency(user.virtualBalance)}</span>
          </div>
        </div>

        {/* Order Form */}
        <form onSubmit={handleSubmit} className="order-form">
          {/* Order Type */}
          <div className="form-group">
            <label>Order Type</label>
            <div className="order-type-tabs">
              <button
                type="button"
                className={`tab ${orderType === 'MARKET' ? 'active' : ''}`}
                onClick={() => {
                  setOrderType('MARKET');
                  setPrice(stock.currentPrice.toFixed(2));
                }}
              >
                Market
              </button>
              <button
                type="button"
                className={`tab ${orderType === 'LIMIT' ? 'active' : ''}`}
                onClick={() => setOrderType('LIMIT')}
              >
                Limit
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="form-group">
            <label htmlFor="quantity">Quantity</label>
            <div className="input-with-button">
              <input
                type="number"
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
                min="1"
                max={action === 'SELL' && userHolding ? userHolding.quantity : undefined}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="max-btn"
                onClick={handleMaxQuantity}
                disabled={loading}
              >
                Max
              </button>
            </div>
            {action === 'SELL' && userHolding && (
              <div className="quantity-hint">
                <Trans>You own {userHolding.quantity} share{userHolding.quantity > 1 ? 's' : ''}</Trans>
              </div>
            )}
          </div>

          {/* Price Input */}
          <div className="form-group">
            <label htmlFor="price">Price per share</label>
            <input
              type="number"
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price"
              step="0.01"
              min="0.01"
              required
              disabled={loading || orderType === 'MARKET'}
            />
            {orderType === 'MARKET' && (
              <div className="input-note">
                Market orders execute at current market price
              </div>
            )}
          </div>

          {/* Order Preview */}
          {orderPreview && (
            <div className="order-preview">
              <h4>
                <Calculator size={16} />
                Order Preview
              </h4>
              <div className="preview-details">
                <div className="preview-row">
                  <span>Quantity:</span>
                  <span>{orderPreview.quantity} shares</span>
                </div>
                <div className="preview-row">
                  <span>Price:</span>
                  <span>{formatCurrency(orderPreview.price)}</span>
                </div>
                <div className="preview-row total">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(orderPreview.totalAmount)}</span>
                </div>
                {action === 'BUY' && (
                  <div className="preview-row">
                    <span>Remaining Balance:</span>
                    <span>{formatCurrency(user.virtualBalance - orderPreview.totalAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Validation Messages */}
          {validation && (
            <div className="validation-messages">
              {validation.errors.map((error, index) => (
                <div key={index} className="validation-error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              ))}
              {validation.warnings.map((warning, index) => (
                <div key={index} className="validation-warning">
                  <AlertCircle size={16} />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`submit-btn ${action.toLowerCase()}`}
              disabled={loading || (validation && !validation.valid) || (action === 'SELL' && !userHolding)}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Processing...
                </>
              ) : action === 'SELL' && !userHolding ? (
                <>
                  <AlertCircle size={16} />
                  Cannot Sell - No Holdings
                </>
              ) : (
                <>
                  {action === 'BUY' ? <ShoppingCart size={16} /> : <Minus size={16} />}
                  {action} {stock.symbol}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Educational Note */}
        <div className="educational-note">
          <div className="note-icon">
            <CheckCircle size={16} />
          </div>
          <div className="note-text">
            <strong>Virtual Trading:</strong> This is practice trading with virtual money. 
            No real money is involved in this transaction.
          </div>
        </div>
      </div>

      {/* Sell Confirmation Modal */}
      {showConfirmation && action === 'SELL' && saleCalculation && (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">
            <div className="confirmation-header">
              <h3>🔄 <Trans>Confirm Sale</Trans></h3>
              <p><Trans>Please review the details before selling</Trans></p>
            </div>

            <div className="confirmation-content">
              {/* Sale Summary */}
              <div className="sale-summary">
                <div className="summary-row">
                  <span><Trans>Stock</Trans>:</span>
                  <span>{stock.symbol} - {stock.companyName}</span>
                </div>
                <div className="summary-row">
                  <span><Trans>Quantity to Sell</Trans>:</span>
                  <span>{quantity} {quantity > 1 ? 'shares' : 'share'}</span>
                </div>
                <div className="summary-row">
                  <span><Trans>Originally Bought At</Trans>:</span>
                  <span>{formatCurrency(userHolding.averagePrice)}</span>
                </div>
                <div className="summary-row">
                  <span><Trans>Selling At</Trans>:</span>
                  <span>{formatCurrency(parseFloat(price))}</span>
                </div>
                <div className="summary-row highlight">
                  <span><Trans>Sale Amount</Trans>:</span>
                  <span>{formatCurrency(saleCalculation.saleAmount)}</span>
                </div>
              </div>

              {/* Profit/Loss Analysis */}
              <div className={`pnl-analysis ${saleCalculation.profitLoss >= 0 ? 'profit' : 'loss'}`}>
                <div className="pnl-header">
                  {saleCalculation.profitLoss >= 0 ? (
                    <span>📈 <Trans>Your Profit</Trans></span>
                  ) : (
                    <span>📉 <Trans>Your Loss</Trans></span>
                  )}
                </div>
                <div className="pnl-amount">
                  {saleCalculation.profitLoss >= 0 ? '+' : ''}{formatCurrency(saleCalculation.profitLoss)} 
                  ({saleCalculation.profitLossPercent >= 0 ? '+' : ''}{saleCalculation.profitLossPercent.toFixed(2)}%)
                </div>
                <div className="pnl-explanation">
                  {saleCalculation.profitLoss >= 0 ? (
                    <Trans>Congratulations! You made a profit on this trade.</Trans>
                  ) : (
                    <>
                      <Trans>Loss is normal in stock market</Trans> - 
                      <span className="hindi-text"> यह शेयर बाज़ार में सामान्य है</span>
                    </>
                  )}
                </div>
              </div>

              {/* Balance Preview */}
              <div className="balance-preview">
                <div className="balance-row">
                  <span><Trans>Current Balance</Trans>:</span>
                  <span>{formatCurrency(user?.virtualBalance || 0)}</span>
                </div>
                <div className="balance-row highlight">
                  <span><Trans>New Balance After Sale</Trans>:</span>
                  <span>{formatCurrency(saleCalculation.newBalance)}</span>
                </div>
              </div>

              {/* Holdings After Sale */}
              <div className="holdings-after-sale">
                {saleCalculation.isCompletelySellingOut ? (
                  <div className="complete-sale-notice">
                    <AlertCircle size={16} />
                    <Trans>You will completely sell all shares of {stock.symbol}</Trans>
                  </div>
                ) : (
                  <div className="remaining-shares">
                    <Trans>Remaining shares after sale</Trans>: {saleCalculation.remainingShares}
                  </div>
                )}
              </div>
            </div>

            <div className="confirmation-actions">
              <button 
                type="button" 
                className="cancel-btn"
                onClick={() => setShowConfirmation(false)}
              >
                <Trans>Cancel</Trans>
              </button>
              <button 
                type="button" 
                className="confirm-btn"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <><div className="loading-spinner"></div> <Trans>Processing...</Trans></>
                ) : (
                  <><Minus size={16} /> <Trans>Confirm Sale</Trans></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingModal;
