import React, { useState, useEffect, useRef } from 'react';
import './AnimatedStockestTitle.css';

const AnimatedStockestTitle = () => {
  const [isGreenPhase, setIsGreenPhase] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const changePhase = () => {
      setIsTransitioning(true);
      
      // Allow CSS transitions to settle before changing phase - increased for smoother transitions
      setTimeout(() => {
        setIsGreenPhase(prev => !prev);
        setIsTransitioning(false);
      }, 200);
    };

    // Enhanced random interval between 4-8 seconds with better distribution
    const getRandomInterval = () => {
      const min = 4000; // 4 seconds
      const max = 8000; // 8 seconds
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const scheduleNextChange = () => {
      timeoutRef.current = setTimeout(() => {
        changePhase();
        scheduleNextChange();
      }, getRandomInterval());
    };

    scheduleNextChange();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="animated-stockest-container">
      <div className="stockest-title-wrapper">
        {/* Stock letters with market animation */}
        <span 
          className={`stock-letters ${isGreenPhase ? 'green-phase' : 'red-phase'} ${isTransitioning ? 'transitioning' : ''}`}
        >
          <span className="letter">S</span>
          <span className="letter">t</span>
          <span className="letter">o</span>
          <span className="letter">c</span>
          <span className="letter">k</span>
        </span>

        {/* Est letters with golden glass effect */}
        <span className="est-letters">
          <span className="letter">e</span>
          <span className="letter">s</span>
          <span className="letter">t</span>
        </span>

        {/* Market direction arrow */}
        <span 
          className={`market-arrow ${isGreenPhase ? 'arrow-up' : 'arrow-down'} ${isTransitioning ? 'transitioning' : ''}`}
        >
          {isGreenPhase ? '↗' : '↘'}
        </span>
      </div>
    </div>
  );
};

export default AnimatedStockestTitle;
