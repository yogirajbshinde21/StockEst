import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import AnimatedPrice from './AnimatedPrice';
import { usePriceTracker } from '../hooks/usePriceTracker';
import './StockTicker.css';

const StockTicker = () => {
  const { stockData, isConnected, refreshStockData } = useSocket();
  const [tickerData, setTickerData] = useState([]);
  const tickerRef = useRef(null);
  
  const { getPriceInfo } = usePriceTracker(stockData?.stocks || [], 'instrumentKey', 'currentPrice');

  // Ensure we have stock data for the ticker
  useEffect(() => {
    if (isConnected && (!stockData?.stocks || stockData.stocks.length === 0)) {
      console.log('📊 StockTicker: No stock data found, triggering refresh...');
      refreshStockData();
    }
  }, [isConnected, stockData, refreshStockData]);

  useEffect(() => {
    if (stockData && stockData.stocks && stockData.stocks.length > 0) {
      // Format stock data for ticker display
      const formattedData = stockData.stocks.map(stock => {
        const priceInfo = getPriceInfo(stock.instrumentKey);
        return {
          symbol: stock.symbol,
          companyName: stock.companyName,
          currentPrice: stock.currentPrice,
          previousPrice: priceInfo.previousPrice,
          change: stock.change,
          changePercent: stock.changePercent,
          isPositive: stock.change >= 0,
          instrumentKey: stock.instrumentKey
        };
      });
      
      setTickerData(formattedData);
    }
  }, [stockData, getPriceInfo]);

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

  const renderTickerItem = (stock, index) => (
    <div key={`${stock.instrumentKey}-${index}`} className="ticker-item">
      <span className="ticker-symbol">{stock.symbol}</span>
      <div className="ticker-price-container">
        <AnimatedPrice
          value={stock.currentPrice}
          previousValue={stock.previousPrice}
          currency={true}
          decimals={2}
          showArrow={true}
          showChange={true}
          changeValue={stock.change}
          changePercent={stock.changePercent}
          size="small"
          className="ticker-animated-price"
        />
      </div>
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