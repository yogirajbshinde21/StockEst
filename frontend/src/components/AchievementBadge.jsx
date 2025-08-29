import React from 'react';
import './AchievementBadge.css';

const AchievementBadge = ({ 
  achievement, 
  unlocked = false, 
  progress = null,
  size = 'normal',
  showTooltip = true,
  isNew = false
}) => {
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

  const getRarityClass = (tier) => {
    switch (tier) {
      case 'rare': return 'rare';
      case 'epic': return 'epic';
      case 'legendary': return 'legendary';
      default: return '';
    }
  };

  const formatProgress = (current, required) => {
    if (current >= required) return 'Complete';
    return `${current}/${required}`;
  };

  const getTooltipText = () => {
    if (!achievement) return '';
    
    let tooltip = achievement.description;
    if (achievement.descriptionHindi) {
      tooltip += ` | ${achievement.descriptionHindi}`;
    }
    
    if (!unlocked && progress) {
      tooltip += ` | Progress: ${formatProgress(progress.current, progress.required)}`;
    }
    
    return tooltip;
  };

  if (!achievement) return null;

  const badgeClasses = [
    'achievement-badge',
    !unlocked ? 'locked' : '',
    getRarityClass(achievement.tier),
    size === 'mini' ? 'mini' : '',
    isNew ? 'new' : ''
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={badgeClasses}
      data-tooltip={showTooltip ? getTooltipText() : ''}
      title={showTooltip ? getTooltipText() : ''}
    >
      <span className="badge-emoji">
        {unlocked ? getAchievementEmoji(achievement.id) : '🔒'}
      </span>
      
      <span className="badge-text">
        {unlocked ? achievement.name : 'Locked'}
      </span>
      
      {!unlocked && progress && (
        <span className="badge-progress">
          ({formatProgress(progress.current, progress.required)})
        </span>
      )}
    </div>
  );
};

export default AchievementBadge;
