import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import './StockTicker.css';

const StockTicker = () => {
  const { stockData, isConnected } = useSocket();
  const [tickerData, setTickerData] = useState([]);
  const tickerRef = useRef(null);

  useEffect(() => {
    if (stockData && stockData.stocks && stockData.stocks.length > 0) {
      // Format stock data for ticker display
      const formattedData = stockData.stocks.map(stock => ({
        symbol: stock.symbol,
        companyName: stock.companyName,
        currentPrice: stock.currentPrice,
        change: stock.change,
        changePercent: stock.changePercent,
        isPositive: stock.change >= 0,
        instrumentKey: stock.instrumentKey
      }));
      setTickerData(formattedData);
    }
  }, [stockData]);

  useEffect(() => {
    // Calculate and set animation duration based on content width
    if (tickerRef.current && tickerData.length > 0) {
      const contentWidth = tickerRef.current.scrollWidth / 2; // Divide by 2 since we duplicate content
      const screenWidth = window.innerWidth;
      
      // Calculate duration for consistent speed (60px per second)
      const baseSpeed = 60; // pixels per second
      const totalDistance = contentWidth + screenWidth;
      const duration = totalDistance / baseSpeed;
      
      tickerRef.current.style.animationDuration = `${duration}s`;
    }
  }, [tickerData]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(price);
  };

  const formatChange = (change) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  };

  const formatChangePercent = (changePercent) => {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  };

  const renderTickerItem = (stock, index) => (
    <div key={`${stock.instrumentKey}-${index}`} className="ticker-item">
      <span className="ticker-symbol">{stock.symbol}</span>
      <span className="ticker-price">{formatPrice(stock.currentPrice)}</span>
      <span className={`ticker-change ${stock.isPositive ? 'positive' : 'negative'}`}>
        <span className="change-arrow">
          {stock.isPositive ? '▲' : '▼'}
        </span>
        <span className="change-value">{formatChange(stock.change)}</span>
        <span className="change-percent">({formatChangePercent(stock.changePercent)})</span>
      </span>
    </div>
  );

  // If no data available, show loading state
  if (!tickerData || tickerData.length === 0) {
    return (
      <div className="stock-ticker">
        <div className="ticker-track">
          <div className="ticker-content loading">
            <div className="loading-message">
              {isConnected ? 'Loading market data...' : 'Connecting to market data...'}
            </div>
          </div>
        </div>
        {!isConnected && (
          <div className="connection-indicator">
            <span className="connection-dot offline"></span>
            <span className="connection-text">Offline</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`stock-ticker ${!isConnected ? 'market-closed' : ''}`}>
      <div className="ticker-track">
        <div className="ticker-content" ref={tickerRef}>
          {/* First set of ticker data */}
          {tickerData.map((stock, index) => renderTickerItem(stock, `first-${index}`))}
          
          {/* Duplicate set for seamless loop */}
          {tickerData.map((stock, index) => renderTickerItem(stock, `second-${index}`))}
        </div>
      </div>
      
      {!isConnected && (
        <div className="connection-indicator">
          <span className="connection-dot offline"></span>
          <span className="connection-text">Offline</span>
        </div>
      )}
    </div>
  );
};

export default StockTicker;