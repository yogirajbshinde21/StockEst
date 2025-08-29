import React, { useState, useEffect, useCallback } from 'react';
import './AchievementNotification.css';

const AchievementNotification = ({ achievement, onClose, show }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (show && achievement) {
      setIsVisible(true);
      // Auto close after 6 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 6000);
      
      return () => clearTimeout(timer);
    }
  }, [show, achievement, handleClose]);

  if (!isVisible || !achievement) return null;

  const getAchievementEmoji = (id) => {
    const emojiMap = {
      'first_trade': '🎯',
      'profit_master': '💰',
      'risk_manager': '🛡️',
      'login_streak_7': '🔥',
      'portfolio_growth': '📈',
      'volume_trader': '⚡',
      'profit_streak': '🏆',
      'diamond_hands': '💎',
      'market_veteran': '🎖️',
      'trading_guru': '🧙‍♂️'
    };
    return emojiMap[id] || '🏅';
  };

  const getRewardIcon = (type) => {
    switch (type) {
      case 'xp': return '⭐';
      case 'money': return '💵';
      case 'badge': return '🏅';
      default: return '🎁';
    }
  };

  return (
    <>
      <div className="overlay" onClick={handleClose} />
      <div className={`achievement-notification ${isClosing ? 'closing' : ''}`}>
        {/* Celebration confetti */}
        <div className="celebration-confetti">🎉</div>
        <div className="celebration-confetti" style={{ animationDelay: '0.5s' }}>✨</div>
        <div className="celebration-confetti" style={{ animationDelay: '1s' }}>🎊</div>
        
        <div className="achievement-header">
          <h2 className="achievement-title">🎉 Achievement Unlocked!</h2>
          <p className="achievement-subtitle">नई उपलब्धि हासिल की!</p>
        </div>

        <div className="achievement-badge">
          {getAchievementEmoji(achievement.id)}
        </div>

        <div className="achievement-description">
          <strong>{achievement.name}</strong>
        </div>
        
        {achievement.nameHindi && (
          <div className="achievement-description hindi">
            {achievement.nameHindi}
          </div>
        )}

        <div className="achievement-description">
          {achievement.description}
        </div>

        {achievement.descriptionHindi && (
          <div className="achievement-description hindi">
            {achievement.descriptionHindi}
          </div>
        )}

        <div className="achievement-rewards">
          <div className="reward-item">
            <span className="reward-icon">{getRewardIcon('xp')}</span>
            <span>+{achievement.xpReward} XP अंक</span>
          </div>
          {achievement.moneyReward && (
            <div className="reward-item">
              <span className="reward-icon">{getRewardIcon('money')}</span>
              <span>+₹{achievement.moneyReward} Bonus</span>
            </div>
          )}
        </div>

        <button className="close-button" onClick={handleClose}>
          Continue Trading / जारी रखें
        </button>
      </div>
    </>
  );
};

export default AchievementNotification;
