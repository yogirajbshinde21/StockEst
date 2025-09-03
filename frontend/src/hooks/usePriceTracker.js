import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for tracking price changes and managing animated price states
 * @param {Array} stockData - Array of stock data objects
 * @param {string} keyField - Field to use as unique identifier (e.g., 'instrumentKey')
 * @param {string} priceField - Field containing the price value (e.g., 'currentPrice')
 */
export const usePriceTracker = (stockData, keyField = 'instrumentKey', priceField = 'currentPrice') => {
  const [previousPrices, setPreviousPrices] = useState({});
  const [priceChanges, setPriceChanges] = useState({});
  const isInitialLoad = useRef(true);
  const lastUpdateTime = useRef(Date.now());

  useEffect(() => {
    if (!stockData || !Array.isArray(stockData) || stockData.length === 0) {
      return;
    }

    const currentTime = Date.now();
    const timeDiff = currentTime - lastUpdateTime.current;
    
    // Only process if enough time has passed (prevents too frequent updates)
    if (timeDiff < 50 && !isInitialLoad.current) { // Reduced from 100ms to 50ms for better responsiveness
      return;
    }

    const newPriceChanges = {};
    const newPreviousPrices = { ...previousPrices };

    stockData.forEach(item => {
      const key = item[keyField];
      const currentPrice = item[priceField];
      
      if (!key || currentPrice === undefined || currentPrice === null) {
        return;
      }

      // For initial load, just set the prices without triggering animations
      if (isInitialLoad.current) {
        newPreviousPrices[key] = currentPrice;
        newPriceChanges[key] = {
          hasChanged: false,
          direction: null,
          previousValue: currentPrice,
          currentValue: currentPrice,
          lastChangeTime: currentTime
        };
      } else {
        const previousPrice = previousPrices[key];
        
        if (previousPrice !== undefined && previousPrice !== currentPrice) {
          // Price has changed
          const direction = currentPrice > previousPrice ? 'up' : 'down';
          
          newPriceChanges[key] = {
            hasChanged: true,
            direction,
            previousValue: previousPrice,
            currentValue: currentPrice,
            lastChangeTime: currentTime
          };
          
          console.log(`💰 Price changed for ${key}: ${previousPrice} → ${currentPrice} (${direction})`);
          
          // Update previous price after a delay to allow animation
          setTimeout(() => {
            setPreviousPrices(prev => ({
              ...prev,
              [key]: currentPrice
            }));
          }, 100);
        } else {
          // Price hasn't changed or first time seeing this stock
          newPriceChanges[key] = {
            hasChanged: false,
            direction: null,
            previousValue: previousPrice || currentPrice,
            currentValue: currentPrice,
            lastChangeTime: currentTime
          };
          
          if (previousPrice === undefined) {
            newPreviousPrices[key] = currentPrice;
          }
        }
      }
    });

    if (isInitialLoad.current) {
      setPreviousPrices(newPreviousPrices);
      isInitialLoad.current = false;
      console.log('🎯 Price tracker initialized with', Object.keys(newPreviousPrices).length, 'stocks');
    }

    setPriceChanges(newPriceChanges);
    lastUpdateTime.current = currentTime;

  }, [stockData, keyField, priceField, previousPrices]);

  // Function to get price info for a specific item
  const getPriceInfo = useCallback((key) => {
    const change = priceChanges[key];
    const previousPrice = previousPrices[key];
    
    return {
      previousPrice: previousPrice || 0,
      currentPrice: change?.currentValue || 0,
      hasChanged: change?.hasChanged || false,
      direction: change?.direction || null,
      changeInfo: change || null
    };
  }, [priceChanges, previousPrices]);

  // Function to reset price tracking (useful for component unmount/remount)
  const resetPriceTracking = () => {
    setPreviousPrices({});
    setPriceChanges({});
    isInitialLoad.current = true;
  };

  return {
    previousPrices,
    priceChanges,
    getPriceInfo,
    resetPriceTracking
  };
};

/**
 * Hook for tracking portfolio/dashboard summary values
 * @param {Object} portfolioData - Portfolio data object
 * @param {Object} userData - User data object
 */
export const usePortfolioTracker = (portfolioData, userData) => {
  const [previousValues, setPreviousValues] = useState({});
  const isInitialLoad = useRef(true);
  const lastValues = useRef({});

  useEffect(() => {
    if (!portfolioData && !userData) return;

    const currentValues = {
      balance: userData?.virtualBalance || 0,
      invested: portfolioData?.summary?.totalInvested || userData?.totalInvested || 0,
      portfolioValue: portfolioData?.summary?.currentValue || userData?.totalPortfolioValue || 0,
      profitLoss: portfolioData?.summary?.totalProfitLoss || userData?.totalProfitLoss || 0,
      profitLossPercent: portfolioData?.summary?.totalProfitLossPercent || userData?.totalProfitLossPercent || 0
    };

    if (isInitialLoad.current) {
      setPreviousValues(currentValues);
      lastValues.current = currentValues;
      isInitialLoad.current = false;
    } else {
      // Only update previous values if there's an actual change
      const hasChanges = Object.keys(currentValues).some(
        key => Math.abs(currentValues[key] - (lastValues.current[key] || 0)) > 0.01
      );

      if (hasChanges) {
        // Store current as previous for animation
        setPreviousValues(lastValues.current);
        
        // Delay the update to allow for animation
        setTimeout(() => {
          lastValues.current = currentValues;
          setPreviousValues(currentValues);
        }, 100);
      }
    }
  }, [portfolioData, userData]);

  const getPreviousValue = useCallback((key) => previousValues[key] || 0, [previousValues]);

  const resetPortfolioTracking = () => {
    setPreviousValues({});
    lastValues.current = {};
    isInitialLoad.current = true;
  };

  return {
    previousValues,
    getPreviousValue,
    resetPortfolioTracking
  };
};

export default usePriceTracker;
