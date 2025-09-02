import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { WavyBackground } from '../components/ui/WavyBackground';
import AnimatedStockestTitle from '../components/AnimatedStockestTitle';
import AnimatedPrice from '../components/AnimatedPrice';
import './Landing.css';


// Custom LazyVideo component with auto-start functionality
const LazyVideo = ({ videoId, title, height = '300px' }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoaded) {
          setIsVisible(true);
          // Auto-start video after a short delay to ensure smooth loading
          setTimeout(() => {
            setIsLoaded(true);
          }, 500);
        }
      },
      { threshold: 0.1 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, [isLoaded]);

  return (
    <div ref={videoRef} style={{ width: '100%', height, borderRadius: '1rem', overflow: 'hidden' }}>
      {!isLoaded ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            borderRadius: '1rem',
            transition: 'opacity 0.3s ease'
          }}
        >
          {isVisible && (
            <div style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              animation: 'pulse 1.5s infinite'
            }}>
              ▶
            </div>
          )}
        </div>
      ) : (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&playlist=${videoId}&enablejsapi=1&iv_load_policy=3&fs=0&disablekb=1&cc_load_policy=0&autohide=1&wmode=opaque&origin=${window.location.origin}`}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          title={title}
          style={{ 
            borderRadius: '1rem',
            pointerEvents: 'none',
            border: 'none',
            outline: 'none'
          }}
        />
      )}
    </div>
  );
};

const Landing = () => {
  const [isVisible, setIsVisible] = useState({});
  const [progress, setProgress] = useState(0);
  const [achievement, setAchievement] = useState({ show: false, message: '' });
  const [stockPrices, setStockPrices] = useState({});
  const [previousStockPrices, setPreviousStockPrices] = useState({});
  const [openFAQ, setOpenFAQ] = useState(null);
  const { currentLanguage } = useLanguage();
  const observerRef = useRef(null);
  const achievementsUnlocked = useRef(new Set());

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

  // Features with lite-youtube embedded videos for high performance
  const features = [
    {
      id: 1,
      videoId: "vEBvHDGFbBo",
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
      videoId: "LsR1mf4Yy5I",
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
      videoId: "kvKPFyMe1ok",
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
      videoId: "JTpeZv-Az80",
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
      videoId: "C8pw6HciosY",
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
      videoId: "rK2QJ4XKw_I",
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
      videoId: "tIbCrVj_Gck",
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

  // FAQ Data
  const faqData = [
    {
      question: {
        en: "Do you require real money to start trading?",
        hi: "क्या ट्रेडिंग शुरू करने के लिए वास्तविक पैसे की आवश्यकता है?"
      },
      answer: {
        en: "No, Stockest is completely free! We provide you with ₹1 Lakh virtual money to help you get started. Practice trading without any financial risk and learn the market dynamics safely.",
        hi: "नहीं, Stockest पूरी तरह से मुफ्त है! हम आपको शुरुआत करने के लिए ₹1 लाख वर्चुअल पैसा प्रदान करते हैं। बिना किसी वित्तीय जोखिम के ट्रेडिंग का अभ्यास करें और सुरक्षित रूप से बाजार की गतिशीलता सीखें।"
      }
    },
    {
      question: {
        en: "Is Stockest available in Indian languages?",
        hi: "क्या Stockest भारतीय भाषाओं में उपलब्ध है?"
      },
      answer: {
        en: "Yes! Stockest supports 10 Indian languages including Hindi, Telugu, Tamil, Bengali, Marathi, Gujarati, Kannada, Malayalam, and Punjabi. Our platform breaks language barriers to make stock market accessible for everyone.",
        hi: "हाँ! Stockest हिंदी, तेलुगु, तमिल, बंगाली, मराठी, गुजराती, कन्नड़, मलयालम और पंजाबी सहित 10 भारतीय भाषाओं का समर्थन करता है। हमारा प्लेटफॉर्म भाषा की बाधाओं को तोड़कर सभी के लिए स्टॉक मार्केट को सुलभ बनाता है।"
      }
    },
    {
      question: {
        en: "How accurate are the stock prices on your platform?",
        hi: "आपके प्लेटफॉर्म पर स्टॉक की कीमतें कितनी सटीक हैं?"
      },
      answer: {
        en: "We use real-time market data to ensure accuracy. While the trading is simulated, the stock prices, market movements, and company information are based on actual market conditions to provide realistic trading experience.",
        hi: "हम सटीकता सुनिश्चित करने के लिए रियल-टाइम बाजार डेटा का उपयोग करते हैं। जबकि ट्रेडिंग सिमुलेटेड है, स्टॉक की कीमतें, बाजार की गतिविधियां और कंपनी की जानकारी वास्तविक बाजार की स्थितियों पर आधारित हैं।"
      }
    },
    {
      question: {
        en: "Can I compete with other users on the platform?",
        hi: "क्या मैं प्लेटफॉर्म पर अन्य उपयोगकर्ताओं के साथ प्रतिस्पर्धा कर सकता हूं?"
      },
      answer: {
        en: "Absolutely! Stockest features a gamified leaderboard system where you can compete with investors nationwide, earn achievements, and climb rankings. Make learning fun through competitive trading challenges.",
        hi: "बिल्कुल! Stockest में एक गेमिफाइड लीडरबोर्ड सिस्टम है जहां आप देशभर के निवेशकों के साथ प्रतिस्पर्धा कर सकते हैं, उपलब्धियां अर्जित कर सकते हैं और रैंकिंग में चढ़ सकते हैं।"
      }
    },
    {
      question: {
        en: "Do I need any prior knowledge about stock markets?",
        hi: "क्या मुझे स्टॉक मार्केट के बारे में पूर्व ज्ञान की आवश्यकता है?"
      },
      answer: {
        en: "Not at all! Stockest is designed for beginners. Our AI-powered assistant provides personalized guidance, educational content, and smart recommendations. Learn by doing in a risk-free environment.",
        hi: "बिल्कुल नहीं! Stockest शुरुआती लोगों के लिए डिज़ाइन किया गया है। हमारा AI-संचालित असिस्टेंट व्यक्तिगत मार्गदर्शन, शैक्षिक सामग्री और स्मार्ट सुझाव प्रदान करता है।"
      }
    },
    {
      question: {
        en: "How does the AI assistant help me?",
        hi: "AI असिस्टेंट मेरी कैसे मदद करता है?"
      },
      answer: {
        en: "Our advanced AI chatbot (powered by Gemini) provides 24/7 personalized investment advice, real-time portfolio analysis, market insights, and answers your questions in your preferred language.",
        hi: "हमारा उन्नत AI चैटबॉट (Gemini द्वारा संचालित) 24/7 व्यक्तिगत निवेश सलाह, रियल-टाइम पोर्टफोलियो विश्लेषण, बाजार की अंतर्दृष्टि प्रदान करता है।"
      }
    },
    {
      question: {
        en: "Can I access real-time financial news?",
        hi: "क्या मैं रियल-टाइम वित्तीय समाचार प्राप्त कर सकता हूं?"
      },
      answer: {
        en: "Yes! Stay updated with the latest market news powered by advanced AI. Get curated insights that matter for your investment decisions with personalized news recommendations.",
        hi: "हाँ! उन्नत AI द्वारा संचालित नवीनतम बाजार समाचारों के साथ अपडेट रहें। व्यक्तिगत समाचार सिफारिशों के साथ अपने निवेश निर्णयों के लिए महत्वपूर्ण अंतर्दृष्टि प्राप्त करें।"
      }
    },
    {
      question: {
        en: "Is my data safe and secure on Stockest?",
        hi: "क्या Stockest पर मेरा डेटा सुरक्षित है?"
      },
      answer: {
        en: "Absolutely! We implement bank-grade security measures to protect your data. Since no real money is involved, your financial security is never at risk while you learn and practice.",
        hi: "बिल्कुल! हम आपके डेटा की सुरक्षा के लिए बैंक-ग्रेड सुरक्षा उपाय लागू करते हैं। चूंकि कोई वास्तविक पैसा शामिल नहीं है, आपकी वित्तीय सुरक्षा कभी भी जोखिम में नहीं है।"
      }
    },
    {
      question: {
        en: "Can I use Stockest on my mobile phone?",
        hi: "क्या मैं अपने मोबाइल फोन पर Stockest का उपयोग कर सकता हूं?"
      },
      answer: {
        en: "Yes! Stockest is fully responsive and works seamlessly on mobile devices, tablets, and desktops. Trade and monitor your portfolio anytime, anywhere.",
        hi: "हाँ! Stockest पूरी तरह से रिस्पॉन्सिव है और मोबाइल डिवाइस, टैबलेट और डेस्कटॉप पर सहजता से काम करता है। कभी भी, कहीं भी ट्रेड करें और अपने पोर्टफोलियो की निगरानी करें।"
      }
    },
    {
      question: {
        en: "How do watchlists and alerts work?",
        hi: "वॉचलिस्ट और अलर्ट कैसे काम करते हैं?"
      },
      answer: {
        en: "Create personalized watchlists of stocks you're interested in and set intelligent price alerts. Get instant notifications when your target stocks hit optimal price points, so you never miss opportunities.",
        hi: "आपकी रुचि के स्टॉक्स की व्यक्तिगत वॉचलिस्ट बनाएं और बुद्धिमान प्राइस अलर्ट सेट करें। जब आपके लक्षित स्टॉक्स अनुकूल कीमत बिंदुओं पर पहुंचें तो तुरंत सूचना पाएं।"
      }
    },
    {
      question: {
        en: "What makes Stockest different from other trading simulators?",
        hi: "Stockest को अन्य ट्रेडिंग सिमुलेटर से क्या अलग बनाता है?"
      },
      answer: {
        en: "Stockest is specifically designed for Indian users with multilingual support, cultural relevance, AI-powered guidance, gamification, and focus on rural financial inclusion. It's not just a simulator - it's a complete learning ecosystem.",
        hi: "Stockest विशेष रूप से भारतीय उपयोगकर्ताओं के लिए बहुभाषी समर्थन, सांस्कृतिक प्रासंगिकता, AI-संचालित मार्गदर्शन, गेमिफिकेशन के साथ डिज़ाइन किया गया है। यह केवल एक सिमुलेटर नहीं है - यह एक पूर्ण शिक्षण पारिस्थितिकी तंत्र है।"
      }
    },
    {
      question: {
        en: "Can I track my portfolio performance over time?",
        hi: "क्या मैं समय के साथ अपने पोर्टफोलियो के प्रदर्शन को ट्रैक कर सकता हूं?"
      },
      answer: {
        en: "Yes! Our Portfolio Intelligence Dashboard provides advanced analytics, performance tracking, profit/loss analysis, sector-wise breakdown, and milestone achievements to monitor your investment journey.",
        hi: "हाँ! हमारा पोर्टफोलियो इंटेलिजेंस डैशबोर्ड उन्नत विश्लेषण, प्रदर्शन ट्रैकिंग, लाभ/हानि विश्लेषण, सेक्टर-वार ब्रेकडाउन प्रदान करता है।"
      }
    },
    {
      question: {
        en: "Are there any hidden charges or subscription fees?",
        hi: "क्या कोई छुपी हुई फीस या सब्सक्रिप्शन फीस है?"
      },
      answer: {
        en: "No! Stockest is completely free to use. No hidden charges, no subscription fees, no premium tiers. Our mission is to make financial education accessible to everyone in India.",
        hi: "नहीं! Stockest का उपयोग पूरी तरह से मुफ्त है। कोई छुपी हुई फीस नहीं, कोई सब्सक्रिप्शन फीस नहीं। हमारा मिशन भारत में सभी के लिए वित्तीय शिक्षा को सुलभ बनाना है।"
      }
    },
    {
      question: {
        en: "How realistic is the trading experience?",
        hi: "ट्रेडिंग अनुभव कितना वास्तविक है?"
      },
      answer: {
        en: "Very realistic! We simulate actual market conditions including order execution, price fluctuations, market timings, and trading volumes. The only difference is you're using virtual money instead of real money.",
        hi: "बहुत वास्तविक! हम वास्तविक बाजार की स्थितियों का अनुकरण करते हैं जिसमें ऑर्डर निष्पादन, कीमत में उतार-चढ़ाव, बाजार का समय और ट्रेडिंग वॉल्यूम शामिल है।"
      }
    },
    {
      question: {
        en: "Can Stockest help me transition to real trading later?",
        hi: "क्या Stockest बाद में वास्तविक ट्रेडिंग में संक्रमण में मेरी मदद कर सकता है?"
      },
      answer: {
        en: "Absolutely! Stockest builds your confidence, knowledge, and trading skills in a risk-free environment. Once you're comfortable with market dynamics and have developed a trading strategy, you'll be well-prepared for real market trading.",
        hi: "बिल्कुल! Stockest एक जोखिम-मुक्त वातावरण में आपका आत्मविश्वास, ज्ञान और ट्रेडिंग कौशल बनाता है। एक बार जब आप बाजार की गतिशीलता से सहज हो जाते हैं, तो आप वास्तविक बाजार ट्रेडिंग के लिए तैयार होंगे।"
      }
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

  // Stock Price Updates
  useEffect(() => {
    const updatePrices = () => {
      const newPrices = {};
      
      // Store current prices as previous before updating
      setStockPrices(currentPrices => {
        setPreviousStockPrices({ ...currentPrices });
        return currentPrices;
      });
      
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
      
      // Update with new prices after storing previous
      setTimeout(() => {
        setStockPrices(newPrices);
      }, 0);
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

            // Update progress
            const visibleFeatures = document.querySelectorAll('.feature-item.visible').length + 1;
            const totalFeatures = features.length;
            const newProgress = (visibleFeatures / totalFeatures) * 100;
            setProgress(Math.min(newProgress, 100));

            // Show achievements
            const featureKey = entry.target.dataset.feature;
            if (featureKey && !achievementsUnlocked.current.has(featureKey)) {
              achievementsUnlocked.current.add(featureKey);
              setTimeout(() => {
                showAchievement(featureKey);
              }, 500);
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    const elements = document.querySelectorAll('.feature-item');
    elements.forEach((el) => observerRef.current.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [features.length, showAchievement]);

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

  // Intersection observer for LazyVideo performance optimization
  useEffect(() => {
    const videoContainers = document.querySelectorAll('.video-container');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Preload thumbnails when videos come into view
          const container = entry.target;
          const backgroundImages = container.querySelectorAll('[style*="background-image"]');
          backgroundImages.forEach(element => {
            const style = element.getAttribute('style');
            const match = style.match(/url\(([^)]+)\)/);
            if (match) {
              const img = new Image();
              img.src = match[1].replace(/['"]/g, '');
            }
          });
        }
      });
    }, { threshold: 0.1 });

    videoContainers.forEach(container => observer.observe(container));
    return () => observer.disconnect();
  }, []);

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
            const previousPriceData = previousStockPrices[stock.symbol];
            const currentPrice = priceData ? priceData.price : stock.basePrice;
            const previousPrice = previousPriceData ? previousPriceData.price : stock.basePrice;
            const change = priceData ? priceData.change : 0;
            
            return (
              <div key={`${stock.symbol}-${index}`} className="ticker-item">
                <span className="ticker-symbol">{stock.symbol}</span>
                <div className="ticker-price-container">
                  <AnimatedPrice
                    value={currentPrice}
                    previousValue={previousPrice}
                    currency={true}
                    decimals={2}
                    showArrow={true}
                    showChange={true}
                    changeValue={change}
                    changePercent={change}
                    size="small"
                    className="ticker-animated-price"
                    animate={true}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

     

      {/* Hero Section with Wavy Background */}
      <section className="hero-section-wavy">
        <WavyBackground
          className="max-w-4xl mx-auto pb-40"
          containerClassName="hero-wavy-container"
colors={["#FF9933", "#FFFFFF", "#138808"]}
waveWidth={45}
backgroundFill="#0f0f23"
blur={6}
speed="slow"
waveOpacity={0.35}
        >
          <div className="hero-wavy-content">
            <h1 className="mega-title font-bold text-center mb-6 fade-in">
              <AnimatedStockestTitle />
            </h1>
            <p className="text-xl md:text-2xl text-center text-white/80 fade-in subtitle">
              {currentLanguage === 'en'
                ? 'AI-Powered Stock Market Simulator for Every Indian'
                : 'ग्रामीण भारत के लिए AI-संचालित स्टॉक मार्केट सिम्युलेटर'}
            </p>
            <div className="wavy-hero-buttons">
              <Link to="/register" className="wavy-cta-primary" onClick={createRipple}>
                🚀 {currentLanguage === 'en' ? 'Start Your Journey' : 'अपनी यात्रा शुरू करें'}
              </Link>
              <button 
                onClick={(e) => {
                  createRipple(e);
                  scrollToFeatures();
                }} 
                className="wavy-cta-secondary"
              >
                📈 {currentLanguage === 'en' ? 'Explore Features' : 'फीचर्स देखें'}
              </button>
            </div>
          </div>
        </WavyBackground>
      </section>

      {/* Additional Content Section */}
      <section className="hero-content-section">
        <div className="hero-content-grid">
          <div className="hero-description">
            <h2 className="hero-content-title">
              {currentLanguage === 'en' 
                ? 'Breaking Financial Barriers in Rural India' 
                : 'ग्रामीण भारत में वित्तीय बाधाओं को तोड़ना'}
            </h2>
            <p className="hero-content-text">
              {currentLanguage === 'en'
                ? 'Experience professional stock trading with AI guidance. Breaking barriers, building wealth for everyone, everywhere in rural India.'
                : 'AI मार्गदर्शन के साथ पेशेवर स्टॉक ट्रेडिंग का अनुभव करें। बाधाओं को तोड़ना, ग्रामीण भारत में हर जगह सभी के लिए संपत्ति का निर्माण।'}
            </p>
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
                    <LazyVideo
                      videoId={feature.videoId}
                      title={feature.title[currentLanguage]}
                      height="300px"
                    />
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

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="section-header">
          <h2 className="section-title">
            🙋‍♂️ {currentLanguage === 'en' ? 'Frequently Asked Questions' : 'अक्सर पूछे जाने वाले प्रश्न'}
          </h2>
          <p className="section-subtitle">
            {currentLanguage === 'en'
              ? 'Everything you need to know about Stockest'
              : 'Stockest के बारे में आपको जो कुछ जानना चाहिए'}
          </p>
        </div>
        
        <div className="faq-container">
          {faqData.map((faq, index) => (
            <div 
              key={index}
              className={`faq-item ${openFAQ === index ? 'active' : ''}`}
              onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
            >
              <div className="faq-question">
                <h3>{faq.question[currentLanguage]}</h3>
                <div className={`faq-icon ${openFAQ === index ? 'rotated' : ''}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <div className={`faq-answer ${openFAQ === index ? 'open' : ''}`}>
                <div className="faq-answer-content">
                  <p>{faq.answer[currentLanguage]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

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