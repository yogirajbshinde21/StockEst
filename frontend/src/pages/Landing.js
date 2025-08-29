import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Landing.css';

const Landing = () => {
  const [isVisible, setIsVisible] = useState({});
  const [progress, setProgress] = useState(0);
  const [achievement, setAchievement] = useState({ show: false, message: '' });
  const [stockPrices, setStockPrices] = useState({});
  const [typewriterText, setTypewriterText] = useState('');
  const { currentLanguage, toggleLanguage } = useLanguage();
  const observerRef = useRef(null);
  const achievementsUnlocked = useRef(new Set());
  const [videosLoaded, setVideosLoaded] = useState(new Set());

  const stocks = useMemo(() => [
    { symbol: 'RELIANCE', basePrice: 2456.80 },
    { symbol: 'TCS', basePrice: 3789.20 },
    { symbol: 'INFOSYS', basePrice: 1623.45 },
    { symbol: 'HDFC', basePrice: 2845.90 },
    { symbol: 'WIPRO', basePrice: 456.78 },
    { symbol: 'BHARTI', basePrice: 876.23 },
    { symbol: 'ICICI', basePrice: 934.56 },
    { symbol: 'ADANI', basePrice: 2234.89 }
  ], []);

  const features = [
    {
      id: 1,
      video: "/videos/Language_Feature.mp4",
      title: {
        en: "🌐 Multi-Language Support",
        hi: "🌐 बहुभाषी सहायता"
      },
      description: {
        en: "Experience stock trading in Hindi & English. Breaking language barriers for rural investors to learn and trade confidently with localized content and culturally relevant examples.",
        hi: "हिंदी और अंग्रेजी में स्टॉक ट्रेडिंग का अनुभव करें। ग्रामीण निवेशकों के लिए भाषा की बाधाओं को तोड़कर आत्मविश्वास से सीखें और व्यापार करें।"
      },
      icon: "🌐",
      key: "language"
    },
    {
      id: 2,
      video: "/videos/Buy_Feature.mp4",
      title: {
        en: "💰 Smart Stock Trading",
        hi: "💰 स्मार्ट स्टॉक ट्रेडिंग"
      },
      description: {
        en: "Buy stocks with real-time prices, AI-powered recommendations, and beginner-friendly interface. Advanced algorithms analyze market trends to suggest optimal trading opportunities.",
        hi: "रियल-टाइम प्राइस, AI-संचालित सुझावों और शुरुआती-अनुकूल इंटरफेस के साथ स्टॉक खरीदें। आज ही अपनी निवेश यात्रा शुरू करें!"
      },
      icon: "💰",
      key: "trading"
    },
    {
      id: 3,
      video: "/videos/Portfolio_Feature.mp4",
      title: {
        en: "📊 Portfolio Management",
        hi: "📊 पोर्टफोलियो प्रबंधन"
      },
      description: {
        en: "Track investments with detailed analytics, monitor profit/loss in real-time, and make informed selling decisions. Comprehensive wealth management made simple and visual.",
        hi: "अपने निवेश को ट्रैक करें, लाभ/हानि की निगरानी करें, और सूचित बिक्री निर्णय लें। आपका संपत्ति प्रबंधन सरल और दृश्य बनाया गया।"
      },
      icon: "📊",
      key: "portfolio"
    },
    {
      id: 4,
      video: "/videos/Watchlist_feature.mp4",
      title: {
        en: "⭐ Smart Watchlist & Alerts",
        hi: "⭐ स्मार्ट वॉचलिस्ट और अलर्ट"
      },
      description: {
        en: "Create personalized watchlists, set intelligent price alerts, and never miss investment opportunities. Get instant notifications when target stocks hit optimal price points.",
        hi: "वॉचलिस्ट बनाएं, प्राइस अलर्ट सेट करें, और निवेश के अवसरों को कभी न चूकें। जब आपके लक्षित स्टॉक सही कीमत पर पहुंचें तो सूचना पाएं!"
      },
      icon: "⭐",
      key: "watchlist"
    },
    {
      id: 5,
      video: "/videos/Financial_News_Feature.mp4",
      title: {
        en: "📰 Real-Time Financial News",
        hi: "📰 रियल-टाइम वित्तीय समाचार"
      },
      description: {
        en: "Stay updated with latest market news powered by advanced AI. Get curated insights that matter for your investment decisions with personalized news recommendations.",
        hi: "Perplexity AI द्वारा संचालित नवीनतम बाजार समाचारों के साथ अपडेट रहें। अपने निवेश निर्णयों के लिए महत्वपूर्ण अंतर्दृष्टि प्राप्त करें।"
      },
      icon: "📰",
      key: "news"
    },
    {
      id: 6,
      video: "/videos/Leaderboard_feature.mp4",
      title: {
        en: "🏆 Gamified Leaderboard",
        hi: "🏆 गेमिफाइड लीडरबोर्ड"
      },
      description: {
        en: "Compete with investors nationwide, earn achievements, and climb rankings. Make learning stock market engaging through competitive trading challenges and rewards.",
        hi: "अन्य निवेशकों के साथ प्रतिस्पर्धा करें, उपलब्धियां अर्जित करें, और रैंकिंग में चढ़ें। स्टॉक मार्केट सीखना मजेदार और आकर्षक बनाएं!"
      },
      icon: "🏆",
      key: "leaderboard"
    },
    {
      id: 7,
      video: "/videos/Chatbot_Feature.mp4",
      title: {
        en: "🤖 AI-Powered Assistant",
        hi: "🤖 AI-संचालित सहायक"
      },
      description: {
        en: "Get personalized investment advice from advanced AI chatbot. Real-time portfolio analysis, market insights, and smart recommendations available 24/7 in your preferred language.",
        hi: "हमारे Gemini-संचालित चैटबॉट से व्यक्तिगत निवेश सलाह पाएं। रियल-टाइम पोर्टफोलियो विश्लेषण और स्मार्ट सुझाव आपकी उंगलियों पर।"
      },
      icon: "🤖",
      key: "ai"
    }
  ];

  const achievements = useMemo(() => ({
    welcome: { en: '🚀 Welcome to Stockest!', hi: '🚀 Stockest में आपका स्वागत है!' },
    language: { en: '🌐 Language Explorer!', hi: '🌐 भाषा एक्सप्लोरर!' },
    trading: { en: '💰 Trading Enthusiast!', hi: '💰 ट्रेडिंग उत्साही!' },
    portfolio: { en: '📊 Portfolio Manager!', hi: '📊 पोर्टफोलियो मैनेजर!' },
    watchlist: { en: '⭐ Watchlist Master!', hi: '⭐ वॉचलिस्ट मास्टर!' },
    news: { en: '📰 News Reader!', hi: '📰 समाचार पाठक!' },
    leaderboard: { en: '🏆 Competitor!', hi: '🏆 प्रतियोगी!' },
    ai: { en: '🤖 AI Enthusiast!', hi: '🤖 AI उत्साही!' },
    firstTrade: { en: '🎯 First Trade Completed!', hi: '🎯 पहला ट्रेड पूरा!' },
    complete: { en: '🎉 Platform Explorer - 100% Complete!', hi: '🎉 प्लेटफॉर्म एक्सप्लोरर - 100% पूरा!' }
  }), []);

  const showAchievement = useCallback((key) => {
    const message = achievements[key] ? achievements[key][currentLanguage] : key;
    setAchievement({ show: true, message });
    setTimeout(() => {
      setAchievement({ show: false, message: '' });
    }, 3000);
  }, [currentLanguage, achievements]);

  // Typewriter Effect
  useEffect(() => {
    const text = currentLanguage === 'en' ? 'Stockest' : 'Stockest';
    let i = 0;
    const timer = setTimeout(() => {
      const typeTimer = setInterval(() => {
        if (i < text.length) {
          setTypewriterText(text.substring(0, i + 1));
          i++;
        } else {
          clearInterval(typeTimer);
        }
      }, 150);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentLanguage]);

  // Stock Price Updates
  useEffect(() => {
    const updatePrices = () => {
      const newPrices = {};
      stocks.forEach(stock => {
        const change = (Math.random() - 0.5) * 10;
        const newPrice = stock.basePrice * (1 + change / 100);
        newPrices[stock.symbol] = {
          price: newPrice,
          change: change,
          isPositive: change >= 0
        };
        stock.basePrice = newPrice;
      });
      setStockPrices(newPrices);
    };

    updatePrices();
    const interval = setInterval(updatePrices, 5000);
    return () => clearInterval(interval);
  }, [stocks]);

  // Intersection Observer for animations
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setIsVisible(prev => ({ ...prev, [id]: true }));

            // Load video when feature becomes visible
            const featureKey = entry.target.dataset.feature;
            if (featureKey && !videosLoaded.has(featureKey)) {
              setVideosLoaded(prev => new Set([...prev, featureKey]));
            }

            // Update progress
            const visibleFeatures = document.querySelectorAll('.feature-item.visible').length + 1;
            const totalFeatures = features.length;
            const newProgress = (visibleFeatures / totalFeatures) * 100;
            setProgress(Math.min(newProgress, 100));

            // Show achievements
            if (featureKey && !achievementsUnlocked.current.has(featureKey)) {
              achievementsUnlocked.current.add(featureKey);
              setTimeout(() => {
                showAchievement(featureKey);
              }, 500);
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' } // Load earlier
    );

    const elements = document.querySelectorAll('.feature-item');
    elements.forEach((el) => observerRef.current.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [videosLoaded, features.length, showAchievement]);

  // Show welcome achievement on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      showAchievement('welcome');
    }, 2000);
    return () => clearTimeout(timer);
  }, [showAchievement]);

  // Check for completion achievement
  useEffect(() => {
    if (progress === 100 && !achievementsUnlocked.current.has('complete')) {
      achievementsUnlocked.current.add('complete');
      setTimeout(() => {
        showAchievement('complete');
      }, 1000);
    }
  }, [progress, showAchievement]);

  const createRipple = (event) => {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  const handleStockCardClick = (symbol) => {
    const isProfit = Math.random() > 0.5;
    const change = (Math.random() * 10 + 1).toFixed(2);
    
    // Update stock prices with click result
    setStockPrices(prev => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        clickChange: change,
        isClickProfit: isProfit,
        clicked: true
      }
    }));

    // Show first trade achievement
    if (!achievementsUnlocked.current.has('firstTrade')) {
      achievementsUnlocked.current.add('firstTrade');
      showAchievement('firstTrade');
    }
  };

  const scrollToFeatures = () => {
    document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
  };

  // Parallax effect for scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const bubbles = document.querySelectorAll('.bubble');
      
      bubbles.forEach((bubble, index) => {
        const speed = 0.5 + (index * 0.1);
        bubble.style.transform = `translateY(${scrolled * speed}px) rotate(${scrolled * 0.05}deg)`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-container">
      {/* Continuous Stock Ticker */}
      <div className="stock-ticker">
        <div className="ticker-content">
          {stocks.map((stock, index) => {
            const priceData = stockPrices[stock.symbol];
            return (
              <div key={`${stock.symbol}-${index}`} className="ticker-item">
                <span className="ticker-symbol">{stock.symbol}</span>
                <span className="ticker-price">
                  ₹{priceData ? priceData.price.toFixed(2) : stock.basePrice.toFixed(2)}
                </span>
                <span className={`ticker-change ${priceData ? (priceData.isPositive ? 'positive' : 'negative') : 'positive'}`}>
                  {priceData ? (priceData.isPositive ? '+' : '') + priceData.change.toFixed(2) : '+0.00'}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Animated Background */}
      <div className="animated-bg">
        <div className="stock-chart-pattern"></div>
        <div className="floating-bubbles">
          <div className="bubble profit">NIFTY +1.2%</div>
          <div className="bubble loss">SENSEX -0.8%</div>
          <div className="bubble profit">BANK NIFTY +2.1%</div>
        </div>
        <div className="particles">
          {[...Array(30)].map((_, i) => (
            <div key={i} className="particle" />
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="landing-header">
        <nav className="navbar">
          <div className="nav-brand">
            <span className="logo">📊 Stockest</span>
          </div>
          <div className="nav-links">
            
            <Link to="/login" className="nav-btn login-btn" onClick={createRipple}>
              {currentLanguage === 'en' ? 'Login' : 'लॉगिन'}
            </Link>
            <Link to="/register" className="nav-btn signup-btn" onClick={createRipple}>
              {currentLanguage === 'en' ? 'Sign Up' : 'साइन अप'}
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="title-highlight typewriter">{typewriterText}</span>
              <br />
              {currentLanguage === 'en' 
                ? 'AI-Powered Stock Market Simulator' 
                : 'AI-संचालित स्टॉक मार्केट सिम्युलेटर'}
            </h1>
            <p className="hero-subtitle">
              {currentLanguage === 'en'
                ? 'Experience professional stock trading with AI guidance. Breaking barriers, building wealth for everyone, everywhere in rural India.'
                : 'AI मार्गदर्शन के साथ पेशेवर स्टॉक ट्रेडिंग का अनुभव करें। बाधाओं को तोड़ना, ग्रामीण भारत में हर जगह सभी के लिए संपत्ति का निर्माण।'}
            </p>
            <div className="hero-buttons">
              <Link to="/register" className="cta-primary" onClick={createRipple}>
                🚀 {currentLanguage === 'en' ? 'Start Your Journey' : 'अपनी यात्रा शुरू करें'}
              </Link>
              <button 
                onClick={(e) => {
                  createRipple(e);
                  scrollToFeatures();
                }} 
                className="cta-secondary"
              >
                📈 {currentLanguage === 'en' ? 'Explore Features' : 'फीचर्स देखें'}
              </button>
            </div>
            <div className="stock-cards">
              {['RELIANCE', 'TCS', 'INFOSYS'].map(symbol => {
                const priceData = stockPrices[symbol];
                return (
                  <div 
                    key={symbol}
                    className={`stock-card ${priceData?.clicked ? (priceData.isClickProfit ? 'profit' : 'loss') : ''}`}
                    onClick={() => handleStockCardClick(symbol)}
                  >
                    <div className="card-symbol">{symbol}</div>
                    <div className="card-change">
                      {priceData?.clicked 
                        ? `${priceData.isClickProfit ? '+' : '-'}₹${priceData.clickChange}`
                        : (currentLanguage === 'en' ? 'Click to trade' : 'ट्रेड करने के लिए क्लिक करें')
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="hero-visual">
            <div className="rotating-element">
              <div className="portfolio-stats">
                <h3>{currentLanguage === 'en' ? 'Real-Time Trading' : 'रियल-टाइम ट्रेडिंग'}</h3>
                <div className="stat-row">
                  <span>{currentLanguage === 'en' ? 'Portfolio Value' : 'पोर्टफोलियो वैल्यू'}</span>
                  <span className="profit">₹1,24,567</span>
                </div>
                <div className="stat-row">
                  <span>{currentLanguage === 'en' ? "Today's P&L" : 'आज का P&L'}</span>
                  <span className="profit">+₹3,245</span>
                </div>
                <div className="stat-row">
                  <span>{currentLanguage === 'en' ? 'Success Rate' : 'सफलता दर'}</span>
                  <span className="gold">87.5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">
            ✨ {currentLanguage === 'en' ? 'Powerful Features for Smart Trading' : 'स्मार्ट ट्रेडिंग के लिए शक्तिशाली फीचर्स'}
          </h2>
          <p className="section-subtitle">
            {currentLanguage === 'en'
              ? 'Discover how Stockest makes stock market accessible and engaging for everyone'
              : 'जानें कि कैसे Stockest सभी के लिए स्टॉक मार्केट को सुलभ और आकर्षक बनाता है'}
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div 
              key={feature.id}
              id={`feature-${feature.id}`}
              className={`feature-item ${isVisible[`feature-${feature.id}`] ? 'visible' : ''} ${index % 2 === 0 ? 'left-align' : 'right-align'}`}
              data-feature={feature.key}
            >
              <div className="feature-content">
                <div className="feature-info">
                  <div className="feature-icon">{feature.icon}</div>
                  <h3 className="feature-title">
                    {feature.title[currentLanguage]}
                  </h3>
                  <p className="feature-description">
                    {feature.description[currentLanguage]}
                  </p>
                </div>
                <div className="feature-video">
                  <div className="video-container">
                    {videosLoaded.has(feature.key) ? (
                      <video 
                        autoPlay 
                        muted 
                        loop 
                        playsInline
                        controls={false}
                        disablePictureInPicture
                        className="demo-video"
                        onContextMenu={(e) => e.preventDefault()}
                        preload="metadata"
                        poster={`/images/video-posters/${feature.key}-poster.jpg`}
                        onError={(e) => {
                          const placeholder = document.createElement('div');
                          placeholder.className = 'video-placeholder';
                          placeholder.innerHTML = '🎬 Feature Demo Coming Soon';
                          e.target.parentNode.replaceChild(placeholder, e.target);
                        }}
                      >
                        <source src={feature.video} type="video/mp4" />
                        <source src={feature.video.replace('.mp4', '.webm')} type="video/webm" />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <div className="video-placeholder loading">
                        <div className="loading-spinner"></div>
                        <span>Loading {feature.title[currentLanguage]}...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Progress Container */}
      <div className="progress-container">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="progress-text">
          {currentLanguage === 'en' ? 'Exploration' : 'अन्वेषण'}: {Math.round(progress)}%
        </div>
      </div>

      {/* Achievement Notification */}
      <div className={`achievement ${achievement.show ? 'show' : ''}`}>
        {achievement.message}
      </div>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">
            🚀 {currentLanguage === 'en' 
              ? 'Ready to Start Your Investment Journey?' 
              : 'अपनी निवेश यात्रा शुरू करने के लिए तैयार हैं?'}
          </h2>
          <p className="cta-subtitle">
            {currentLanguage === 'en'
              ? 'Join thousands of rural investors who are building wealth with Stockest'
              : 'हजारों ग्रामीण निवेशकों के साथ जुड़ें जो Stockest के साथ संपत्ति का निर्माण कर रहे हैं'}
          </p>
          <div className="cta-buttons">
            <Link to="/register" className="cta-primary large" onClick={createRipple}>
              💎 {currentLanguage === 'en' ? 'Create Free Account' : 'मुफ्त खाता बनाएं'}
            </Link>
            <Link to="/login" className="cta-secondary large" onClick={createRipple}>
              🔑 {currentLanguage === 'en' ? 'Login to Continue' : 'जारी रखने के लिए लॉगिन करें'}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-logo">📊 Stockest</span>
            <p className="footer-tagline">
              {currentLanguage === 'en'
                ? 'Making stock market accessible for everyone'
                : 'सभी के लिए स्टॉक मार्केट को सुलभ बनाना'}
            </p>
          </div>
          <div className="footer-links">
            <div className="footer-section">
              <h4>{currentLanguage === 'en' ? 'Platform' : 'प्लेटफॉर्म'}</h4>
              <span>{currentLanguage === 'en' ? 'Features' : 'फीचर्स'}</span>
              <span>{currentLanguage === 'en' ? 'Security' : 'सुरक्षा'}</span>
            </div>
            <div className="footer-section">
              <h4>{currentLanguage === 'en' ? 'Support' : 'सहायता'}</h4>
              <span>{currentLanguage === 'en' ? 'Help Center' : 'हेल्प सेंटर'}</span>
              <span>{currentLanguage === 'en' ? 'Contact Us' : 'संपर्क करें'}</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 Stockest. {currentLanguage === 'en' ? 'All rights reserved.' : 'सभी अधिकार सुरक्षित।'}</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;