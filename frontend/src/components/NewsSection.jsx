import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Trans from './Trans';
import './NewsSection.css';

const NewsSection = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [newsStats, setNewsStats] = useState(null);
  const { currentLanguage } = useLanguage();

  // Filter options for news
  const filterOptions = [
    { value: 'all', label: 'सभी समाचार - All News', labelHi: 'सभी समाचार' },
    { value: 'portfolio', label: 'पोर्टफोलियो प्रभाव - Portfolio Impact', labelHi: 'पोर्टफोलियो प्रभाव' },
    { value: 'RELIANCE', label: 'Reliance - रिलायंस', labelHi: 'रिलायंस' },
    { value: 'INFY', label: 'Infosys - इंफोसिस', labelHi: 'इंफोसिस' },
    { value: 'TCS', label: 'TCS - टीसीएस', labelHi: 'टीसीएस' },
    { value: 'HDFCBANK', label: 'HDFC Bank - एचडीएफसी बैंक', labelHi: 'एचडीएफसी बैंक' }
  ];

  // Fetch news based on selected filter
  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('कृपया लॉगिन करें - Please login first');
      }

      let url = '';
      switch (selectedFilter) {
        case 'portfolio':
          url = '/api/news/portfolio-impact';
          break;
        case 'all':
          url = '/api/news/latest?limit=15';
          break;
        default:
          // Specific stock
          url = `/api/news/stock/${selectedFilter}?limit=10`;
      }
        
      console.log(`📰 Fetching news: ${url}`);
      
      const response = await fetch(`http://localhost:5000${url}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setNews(data.data || []);
        setError(null);
        console.log(`✅ Fetched ${data.data?.length || 0} news articles`);
      } else {
        setError(data.message || 'समाचार लाने में त्रुटि - Failed to fetch news');
      }
    } catch (err) {
      console.error('❌ Error fetching news:', err);
      setError(err.message || 'नेटवर्क त्रुटि - Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [selectedFilter]);

  // Fetch news statistics
  const fetchNewsStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/news/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setNewsStats(data.data);
        console.log('📊 News stats fetched:', data.data);
      }
    } catch (err) {
      console.error('❌ Error fetching news stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    fetchNewsStats();
  }, [fetchNews, fetchNewsStats]);

  // Format time to Hindi-English mix
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} मिनट पहले - ${diffInMinutes} min ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} घंटे पहले - ${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} दिन पहले - ${days}d ago`;
    }
  };

  // Refresh all data
  const refreshNews = async () => {
    await Promise.all([fetchNews(), fetchNewsStats()]);
  };

  // Loading state
  if (loading && news.length === 0) {
    return (
      <div className="news-section">
        <div className="news-header">
          <h2><Trans>वित्तीय समाचार - Financial News</Trans></h2>
        </div>
        <div className="news-loading">
          <div className="loading-spinner"></div>
          <p><Trans>समाचार लोड हो रहे हैं - Loading latest news...</Trans></p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && news.length === 0) {
    return (
      <div className="news-section">
        <div className="news-header">
          <h2><Trans>वित्तीय समाचार - Financial News</Trans></h2>
        </div>
        <div className="news-error">
          <p>❌ {error}</p>
          <button onClick={refreshNews} className="retry-btn">
            <Trans>पुनः प्रयास करें - Try Again</Trans>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="news-section">
      {/* Header with stats and controls */}
      <div className="news-header">
        <div className="news-title">
          <h2><Trans>वित्तीय समाचार - Financial News</Trans></h2>
          {newsStats && (
            <div className="news-stats">
              <div className="stat-item">
                <span className="stat-label"><Trans>आज के समाचार - Today</Trans>:</span>
                <span className="stat-value">{newsStats.todayNews}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label"><Trans>कुल समाचार - Total</Trans>:</span>
                <span className="stat-value">{newsStats.totalNews}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label"><Trans>API कॉल - API Calls</Trans>:</span>
                <span className="stat-value">{newsStats.callsToday}/{newsStats.maxCallsPerDay}</span>
              </div>
              {newsStats.isMarketDay && (
                <div className="stat-item market-status">
                  <span className="market-open">📈 <Trans>बाजार दिन - Market Day</Trans></span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="news-controls">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="news-filter"
          >
            {filterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {currentLanguage === 'hi' && option.labelHi ? option.labelHi : option.label}
              </option>
            ))}
          </select>
          
          <button 
            onClick={refreshNews} 
            className="refresh-btn"
            disabled={loading}
          >
            {loading ? '⏳' : '🔄'} <Trans>ताज़ा करें - Refresh</Trans>
          </button>
        </div>
      </div>

      {/* News content */}
      {news.length === 0 ? (
        <div className="no-news">
          <p><Trans>चुने गए फिल्टर के लिए कोई समाचार उपलब्ध नहीं - No news available for selected filter</Trans></p>
          <p className="news-hint">
            <Trans>कृपया कुछ समय बाद जांचें या दूसरा फिल्टर चुनें - Please check back later or try a different filter</Trans>
          </p>
        </div>
      ) : (
        <div className="news-grid">
          {news.map((article, index) => (
            <div key={article._id || index} className="news-card">
              <div className="news-card-header">
                <div className="news-meta">
                  <span className="news-source">{article.source}</span>
                  <span className="news-time">{formatTime(article.publishedAt)}</span>
                </div>
                <div className="news-category">
                  {article.category === 'stock-market' ? '📊 शेयर बाजार' : article.category}
                </div>
              </div>

              <div className="news-content">
                <div className="news-text">
                  {article.content}
                </div>
              </div>

              <div className="news-footer">
                <div className="news-language">
                  🌐 <Trans>हिंदी-अंग्रेजी मिश्रण - Hindi-English Mix</Trans>
                </div>
                <div className="news-audience">
                  🎓 <Trans>ग्रामीण शिक्षा - Rural Education</Trans>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more button for 'all' filter */}
      {selectedFilter === 'all' && news.length >= 15 && (
        <div className="news-load-more">
          <button 
            onClick={() => {
              // Implement pagination if needed
              console.log('Load more news functionality can be added here');
            }}
            className="load-more-btn"
          >
            <Trans>और समाचार लोड करें - Load More News</Trans>
          </button>
        </div>
      )}

      {/* Footer info */}
      <div className="news-footer-info">
        <p>
          <Trans>
            समाचार Perplexity AI द्वारा प्रदान किए गए हैं और ग्रामीण छात्रों के लिए सरल भाषा में समझाए गए हैं
            - News provided by Perplexity AI and explained in simple language for rural students
          </Trans>
        </p>
      </div>
    </div>
  );
};

export default NewsSection;
