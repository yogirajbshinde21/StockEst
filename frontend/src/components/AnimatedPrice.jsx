import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import './AnimatedPrice.css';

const AnimatedPrice = ({ 
  value, 
  previousValue, 
  currency = true, 
  decimals = 2,
  showArrow = true,
  showChange = false,
  changeValue = null,
  changePercent = null,
  className = '',
  size = 'medium',
  animate = true,
  prefix = '',
  suffix = ''
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState(null); // 'up', 'down', or null
  const animationRef = useRef(null);
  const previousValueRef = useRef(value);

  // Animation effect when value changes
  useEffect(() => {
    if (!animate || previousValueRef.current === value) return;

    const prevValue = previousValueRef.current;
    const newValue = value;
    
    // Determine direction
    const changeDirection = newValue > prevValue ? 'up' : newValue < prevValue ? 'down' : null;
    
    if (changeDirection) {
      setDirection(changeDirection);
      setIsAnimating(true);

      // Start number morphing animation
      const startValue = prevValue;
      const endValue = newValue;
      const duration = 800; // Animation duration in ms
      const startTime = Date.now();

      const animateNumber = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        
        const currentValue = startValue + (endValue - startValue) * easeOutCubic;
        setDisplayValue(currentValue);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateNumber);
        } else {
          setDisplayValue(endValue);
          // Keep the direction visible for a short time
          setTimeout(() => {
            setDirection(null);
            setIsAnimating(false);
          }, 500);
        }
      };

      animationRef.current = requestAnimationFrame(animateNumber);
    }

    previousValueRef.current = value;

    // Cleanup animation on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, animate]);

  // Format the display value
  const formatValue = (val) => {
    let formattedValue;
    if (currency) {
      formattedValue = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals
      }).format(val);
    } else {
      formattedValue = val.toFixed(decimals);
    }
    
    return `${prefix}${formattedValue}${suffix}`;
  };

  // Format change values
  const formatChange = (change) => {
    const sign = change >= 0 ? '+' : '';
    if (currency) {
      return `${sign}₹${Math.abs(change).toFixed(decimals)}`;
    } else {
      return `${sign}${change.toFixed(decimals)}`;
    }
  };

  const formatChangePercent = (percent) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  // Determine colors based on change
  const getChangeColor = () => {
    if (changeValue !== null) {
      return changeValue >= 0 ? 'positive' : 'negative';
    }
    if (direction) {
      return direction === 'up' ? 'positive' : 'negative';
    }
    return 'neutral';
  };

  const classes = [
    'animated-price',
    `size-${size}`,
    `change-${getChangeColor()}`,
    isAnimating ? 'animating' : '',
    direction ? `direction-${direction}` : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="price-container">
        {/* Main price display */}
        <span className="price-value">
          {formatValue(displayValue)}
        </span>

        {/* Arrow indicator */}
        {showArrow && direction && (
          <span className={`price-arrow ${direction}`}>
            {direction === 'up' ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}
          </span>
        )}
      </div>

      {/* Change information */}
      {showChange && (changeValue !== null || changePercent !== null) && (
        <div className="change-container">
          {changeValue !== null && (
            <span className="change-value">
              {formatChange(changeValue)}
            </span>
          )}
          {changePercent !== null && (
            <span className="change-percent">
              ({formatChangePercent(changePercent)})
            </span>
          )}
        </div>
      )}

      {/* Pulse effect overlay */}
      {isAnimating && (
        <div className={`pulse-overlay ${direction}`}></div>
      )}
    </div>
  );
};

export default AnimatedPrice;
