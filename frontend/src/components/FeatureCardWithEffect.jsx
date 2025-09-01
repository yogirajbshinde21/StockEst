import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CanvasRevealEffect } from './ui/canvas-reveal-effect';

const FeatureCardWithEffect = ({ 
  feature, 
  currentLanguage, 
  index, 
  isVisible, 
  children 
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div 
      className={`feature-item ${isVisible ? 'visible' : ''} ${index % 2 === 0 ? 'left-align' : 'right-align'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      {/* Original Feature Content */}
      <div className="feature-content" style={{ position: 'relative', zIndex: 10 }}>
        <div className="feature-info">
          <div className="feature-icon">{feature.icon}</div>
          <h3 className="feature-title">
            {feature.title[currentLanguage]}
          </h3>
          <p className="feature-description">
            {feature.description[currentLanguage]}
          </p>
        </div>
        {children}
      </div>

      {/* Canvas Reveal Effect Overlay */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ 
              borderRadius: '1.5rem',
              overflow: 'hidden',
              pointerEvents: 'none'
            }}
          >
            <CanvasRevealEffect
              animationSpeed={5}
              containerClassName="bg-transparent"
              colors={[
                [34, 197, 94],   // Green
                [225, 65, 65],   // Red  
                [59, 130, 246],  // Blue
                [139, 92, 246],  // Purple
              ]}
              opacities={[0.1, 0.1, 0.2, 0.2, 0.2, 0.3, 0.3, 0.4, 0.5, 0.8]}
              dotSize={2}
              showGradient={false}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle dark overlay for better text readability when hovered */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black"
            style={{ 
              borderRadius: '1.5rem',
              pointerEvents: 'none',
              zIndex: 5
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeatureCardWithEffect;
