import React, { useState, useEffect } from 'react';
import './AchievementsList.css';

const AchievementsList = ({ userId, showLeaderboard = false }) => {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboardPanel, setShowLeaderboardPanel] = useState(true); // Show by default
  const [leaderboardType, setLeaderboardType] = useState('profit');

  useEffect(() => {
    setLoading(false); // No need to fetch achievements data anymore
    if (showLeaderboard) {
      fetchLeaderboard();
    }
  }, [showLeaderboard]);

  const fetchLeaderboard = async (type = 'profit') => {
    try {
      const response = await fetch(`/api/achievements/leaderboard?type=${type}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setLeaderboard(data.data.leaderboard || []);
        setLeaderboardType(type);
        setShowLeaderboardPanel(true);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  if (loading) {
    return (
      <div className="achievements-list">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="achievements-list">
      {showLeaderboard && (
        <div className="leaderboard-toggle">
          <button 
            className="leaderboard-button"
            onClick={fetchLeaderboard}
          >
            🏆 View Leaderboard / लीडरबोर्ड देखें
          </button>
        </div>
      )}

      {showLeaderboardPanel && leaderboard.length > 0 && (
        <div className="leaderboard-panel" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>🏆 Top Traders / शीर्ष व्यापारी</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => fetchLeaderboard('profit')}
                style={{ 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '15px', 
                  border: '1px solid #ddd',
                  background: leaderboardType === 'profit' ? '#667eea' : 'white',
                  color: leaderboardType === 'profit' ? 'white' : '#333',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Profit/Loss
              </button>
              <button 
                onClick={() => fetchLeaderboard('portfolio')}
                style={{ 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '15px', 
                  border: '1px solid #ddd',
                  background: leaderboardType === 'portfolio' ? '#667eea' : 'white',
                  color: leaderboardType === 'portfolio' ? 'white' : '#333',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Portfolio Value
              </button>
              <button 
                onClick={() => fetchLeaderboard('xp')}
                style={{ 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '15px', 
                  border: '1px solid #ddd',
                  background: leaderboardType === 'xp' ? '#667eea' : 'white',
                  color: leaderboardType === 'xp' ? 'white' : '#333',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                XP
              </button>
            </div>
          </div>
          <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '1rem' }}>
            {leaderboard.slice(0, 15).map((user, index) => (
              <div 
                key={user.userId || user._id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '0.75rem 0',
                  borderBottom: index < 14 ? '1px solid #eee' : 'none',
                  background: index < 3 ? (index === 0 ? '#ffd70020' : index === 1 ? '#c0c0c020' : '#cd7f3220') : 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.2rem', minWidth: '30px' }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </span>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>
                      {user.name || user.email?.split('@')[0] || 'Anonymous'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      Level {user.level || 1} • {user.totalTrades || 0} trades
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {leaderboardType === 'profit' && (
                    <>
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: (user.totalProfitLoss || 0) >= 0 ? '#4caf50' : '#f44336' 
                      }}>
                        ₹{(user.totalProfitLoss || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>
                        Portfolio: ₹{(user.portfolioValue || 0).toLocaleString('en-IN')}
                      </div>
                    </>
                  )}
                  {leaderboardType === 'portfolio' && (
                    <>
                      <div style={{ fontWeight: 'bold', color: '#667eea' }}>
                        ₹{(user.portfolioValue || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: (user.totalProfitLoss || 0) >= 0 ? '#4caf50' : '#f44336' 
                      }}>
                        P&L: ₹{(user.totalProfitLoss || 0).toLocaleString('en-IN')}
                      </div>
                    </>
                  )}
                  {leaderboardType === 'xp' && (
                    <>
                      <div style={{ fontWeight: 'bold', color: '#ff9800' }}>
                        {user.experiencePoints || 0} XP
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>
                        {user.achievementCount || 0} achievements
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementsList;
