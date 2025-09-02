import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import AnimatedPrice from './AnimatedPrice';
import { usePriceTracker } from '../hooks/usePriceTracker';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Trans from './Trans';
import './MarketOverview.css';

const MarketOverview = () => {
  const { stockData, isConnected, refreshStockData } = useSocket();
  const { getPriceInfo } = usePriceTracker(stockData?.stocks || [], 'instrumentKey', 'currentPrice');

  // Ensure we have stock data when component mounts
  useEffect(() => {
    if (isConnected && (!stockData?.stocks || stockData.stocks.length === 0)) {
      console.log('📊 MarketOverview: No stock data found, triggering refresh...');
      refreshStockData();
    }
  }, [isConnected, stockData, refreshStockData]);

  // Define the 4 main companies we want to display
  const mainCompanies = [
    'NSE_EQ|INE002A01018', // RELIANCE
    'NSE_EQ|INE009A01021', // INFY
    'NSE_EQ|INE467B01029', // TCS
    'NSE_EQ|INE040A01034'  // HDFCBANK
  ];

  // Filter and get the main companies data
  const mainStocks = mainCompanies.map(instrumentKey => {
    const stock = stockData?.stocks?.find(s => s.instrumentKey === instrumentKey);
    if (stock) {
      const priceInfo = getPriceInfo(instrumentKey);
      return {
        ...stock,
        priceInfo
      };
    }
    return null;
  }).filter(Boolean);

  if (!isConnected) {
    return (
      <div className="market-overview">
        <div className="overview-header">
          <h2>Market Overview</h2>
          <div className="connection-status disconnected">
            Connecting...
          </div>
        </div>
        <div className="stock-grid loading">
          <div className="loading-message">Loading market data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="market-overview">
      <div className="overview-header">
        <h2><Trans>Market Overview</Trans></h2>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="status-dot"></div>
          <Trans>{isConnected ? 'Live' : 'Disconnected'}</Trans>
        </div>
      </div>
      
      <div className="stock-grid">
        {mainStocks.map((stock) => (
          <div key={stock.instrumentKey} className="stock-card">
            <div className="stock-header">
              <div className="stock-symbol">{stock.symbol}</div>
              <div className={`trend-indicator ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                {stock.change >= 0 ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}
              </div>
            </div>
            
            <div className="stock-company">
              {stock.companyName}
            </div>
            
            <div className="stock-price">
              <AnimatedPrice
                value={stock.currentPrice}
                previousValue={stock.priceInfo.previousPrice}
                currency={true}
                decimals={2}
                showArrow={true}
                showChange={false}
                size="large"
                className="market-overview-price financial-grade trading-platform"
              />
            </div>
            
            <div className="stock-change">
              <div className={`change-value ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                <span className="change-amount">
                  {stock.change >= 0 ? '+' : ''}₹{Math.abs(stock.change).toFixed(2)}
                </span>
                <span className="change-percent">
                  ({stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            
            <div className="stock-meta">
              <div className="meta-item">
                <span className="meta-label"><Trans>High:</Trans></span>
                <span className="meta-value">₹{stock.dayHigh?.toFixed(2) || 'N/A'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label"><Trans>Low:</Trans></span>
                <span className="meta-value">₹{stock.dayLow?.toFixed(2) || 'N/A'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {mainStocks.length === 0 && (
        <div className="no-data">
          <p><Trans>No market data available</Trans></p>
        </div>
      )}
    </div>
  );
};

export default MarketOverview;
