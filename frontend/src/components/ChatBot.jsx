import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Trans from './Trans';
import './ChatBot.css';

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [dailyTip, setDailyTip] = useState('');
  const messagesEndRef = useRef(null);
  const { currentLanguage } = useLanguage();

  // Voice interaction states
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [speechLanguage, setSpeechLanguage] = useState('en-IN'); // Separate state for speech recognition language
  const speechSynthesisRef = useRef(null);

  // Handle voice input - defined early to avoid dependency issues
  const handleVoiceInput = useCallback((transcript, detectedLanguage = null) => {
    // Detect language from the recognition language used
    // If speech recognition was in Hindi (hi-IN), set response language to hindi
    const voiceLanguage = detectedLanguage === 'hi-IN' ? 'hindi' : 'english';
    
    console.log(`🎤 Voice input detected:`, {
      transcript,
      detectedLanguage,
      voiceLanguage
    });
    
    // Create a temporary user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: transcript,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Send to backend (similar to sendMessage but simplified)
    const sendVoiceMessage = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('Please login to use the chatbot');
        }

        console.log(`🚀 Sending request with language: ${voiceLanguage}`);

        const response = await fetch('http://localhost:5000/api/chatbot/query', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: transcript,
            language: voiceLanguage // Use detected voice language instead of current UI language
          })
        });

        const data = await response.json();

        if (data.success) {
          const botMessage = {
            id: Date.now() + 1,
            type: 'bot',
            text: data.data.response,
            timestamp: data.data.timestamp,
            sources: data.data.sources || [],
            isRelevant: data.data.isRelevant,
            portfolioSummary: data.data.portfolioSummary,
            cacheUsed: data.data.cacheUsed,
            memoryContext: data.data.memoryContext,
            portfolioFetched: data.data.portfolioFetched,
            queryType: data.data.queryType
          };

          setMessages(prev => [...prev, botMessage]);
          
          // Auto-speak bot response when voice is enabled
          if (isVoiceEnabled && voiceSupported && speechSynthesisRef.current) {
            const cleanText = data.data.response
              .replace(/🤖|📊|💰|📈|📉|🏢|💡|💾|🧠|🌐|👤/g, '')
              .replace(/₹/g, ' rupees ')
              .replace(/%/g, ' percent ')
              .replace(/\*/g, '')
              .replace(/\n+/g, '. ')
              .trim();
            
            if (cleanText) {
              speechSynthesisRef.current.cancel();
              const utterance = new SpeechSynthesisUtterance(cleanText);
              // Use the same language that was detected from voice input
              utterance.lang = detectedLanguage || (voiceLanguage === 'hindi' ? 'hi-IN' : 'en-IN');
              utterance.rate = 0.8;
              utterance.onstart = () => {
                setIsSpeaking(true);
                console.log(`🔊 Speaking in ${utterance.lang === 'hi-IN' ? 'Hindi' : 'English'}`);
              };
              utterance.onend = () => setIsSpeaking(false);
              utterance.onerror = () => setIsSpeaking(false);
              speechSynthesisRef.current.speak(utterance);
            }
          }
        } else {
          throw new Error(data.message || 'Failed to get response');
        }
      } catch (error) {
        console.error('Error sending voice message:', error);
        const errorMessage = {
          id: Date.now() + 1,
          type: 'bot',
          text: voiceLanguage === 'hindi' 
            ? 'क्षमा करें, कुछ तकनीकी समस्या है। कृपया फिर से कोशिश करें।'
            : 'Sorry, there was a technical issue. Please try again.',
          timestamp: new Date().toISOString(),
          sources: [],
          isError: true
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    };

    sendVoiceMessage();
  }, [isVoiceEnabled, voiceSupported]);

  // Initialize voice features
  useEffect(() => {
    // Check for Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    
    if (SpeechRecognition && speechSynthesis) {
      setVoiceSupported(true);
      
      // Initialize speech recognition
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.maxAlternatives = 1;
      
      // Set language based on speech language setting (not UI language)
      recognitionInstance.lang = speechLanguage;
      
      recognitionInstance.onstart = () => {
        setIsListening(true);
      };
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const recognitionLanguage = recognitionInstance.lang; // Get the language that was used for recognition
        setInputValue(transcript);
        // Auto-send voice input using a ref to avoid dependency issues
        setTimeout(() => {
          // Use the transcript directly rather than depending on sendMessage
          handleVoiceInput(transcript, recognitionLanguage);
        }, 100);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Determine language for error message based on recognition language
        const isHindiRecognition = recognitionInstance.lang === 'hi-IN';
        
        // Show user-friendly error message
        const errorMessages = {
          'no-speech': isHindiRecognition ? 'कोई आवाज़ नहीं सुनाई दी' : 'No speech detected',
          'network': isHindiRecognition ? 'नेटवर्क त्रुटि' : 'Network error',
          'not-allowed': isHindiRecognition ? 'माइक्रोफोन की अनुमति नहीं है' : 'Microphone permission denied'
        };
        
        const errorMessage = errorMessages[event.error] || 
          (isHindiRecognition ? 'वॉइस इनपुट में त्रुटि' : 'Voice input error');
        
        // You could show this error in a toast or status message
        console.log('Voice error:', errorMessage);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
      speechSynthesisRef.current = speechSynthesis;
    } else {
      setVoiceSupported(false);
      console.log('Web Speech API not supported in this browser');
    }
    
    // Cleanup on unmount
    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, [currentLanguage, handleVoiceInput, speechLanguage]);

  // Initialize chatbot with welcome message
  useEffect(() => {
    const fetchDailyTip = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/chatbot/tips?language=${currentLanguage}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        return data.success ? data.data.tip : '';
      } catch (error) {
        console.error('Error fetching tip:', error);
        return '';
      }
    };

    const initializeChatbot = async () => {
      const isHindi = currentLanguage === 'hindi';
      
      const welcomeMessage = {
        id: Date.now(),
        type: 'bot',
        text: isHindi 
          ? 'नमस्ते! मैं आपका स्मार्ट पोर्टफोलियो असिस्टेंट हूँ। मैं आपके सभी निवेश, लेन-देन, और होल्डिंग्स को याद रखता हूँ। आप मुझसे अपने पोर्टफोलियो के बारे में कुछ भी पूछ सकते हैं - मैं आपको वास्तविक समय की जानकारी और व्यक्तिगत सलाह दूंगा!'
          : 'Hello! I\'m your Smart Portfolio Assistant with complete memory of your investments. I remember all your holdings, transactions, and trading patterns. Ask me anything about your portfolio - I\'ll provide real-time insights and personalized advice based on your actual data!',
        timestamp: new Date().toISOString(),
        sources: []
      };

      setMessages([welcomeMessage]);
      
      // Get daily tip
      try {
        const tip = await fetchDailyTip();
        setDailyTip(tip);
      } catch (error) {
        console.error('Error fetching daily tip:', error);
      }
    };

    initializeChatbot();
  }, [currentLanguage]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check if query requires portfolio data
  const checkIfPortfolioQuery = (query) => {
    // Ensure query is a string
    if (!query || typeof query !== 'string') {
      return false;
    }
    
    const portfolioKeywords = [
      'my portfolio', 'my holdings', 'my stocks', 'my investment', 'my position', 'my profit', 'my loss',
      'my trades', 'my balance', 'my performance', 'should i buy', 'should i sell', 'my watchlist',
      'मेरा पोर्टफोलियो', 'मेरे शेयर', 'मेरा निवेश', 'मेरा लाभ', 'मेरा नुकसान', 'मैं खरीदूं', 'मैं बेचूं',
      'what do i own', 'how much profit', 'how much loss', 'my current', 'i have', 'i own',
      'portfolio', 'holdings', 'pnl', 'p&l'
    ];
    
    const queryLower = query.toLowerCase();
    return portfolioKeywords.some(keyword => queryLower.includes(keyword.toLowerCase()));
  };

  // Send message to chatbot
  const sendMessage = useCallback(async (customQuery = null) => {
    const query = customQuery || inputValue.trim();
    if (!query || isLoading) return;

    // Check if query requires portfolio data and show appropriate loading message
    const isPortfolioQuery = checkIfPortfolioQuery(query);

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: query,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Clear input only if using typed input (not quick action)
    if (!customQuery) {
      setInputValue('');
    }
    
    setIsLoading(true);

    // Add portfolio loading message if needed
    if (isPortfolioQuery) {
      const portfolioLoadingMessage = {
        id: Date.now() + 0.5,
        type: 'bot',
        text: currentLanguage === 'hindi' 
          ? '📊 आपका पोर्टफोलियो डेटा लोड कर रहा हूँ...'
          : '📊 Loading your portfolio data...',
        timestamp: new Date().toISOString(),
        sources: [],
        isLoading: true,
        isPortfolioLoading: true
      };
      
      setMessages(prev => [...prev, portfolioLoadingMessage]);
    }

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Please login to use the chatbot');
      }

      const response = await fetch('http://localhost:5000/api/chatbot/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          language: currentLanguage
        })
      });

      const data = await response.json();

      if (data.success) {
        // Remove portfolio loading message if it was added
        if (isPortfolioQuery) {
          setMessages(prev => prev.filter(msg => !msg.isPortfolioLoading));
        }

        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          text: data.data.response,
          timestamp: data.data.timestamp,
          sources: data.data.sources || [],
          isRelevant: data.data.isRelevant,
          portfolioSummary: data.data.portfolioSummary,
          cacheUsed: data.data.cacheUsed,
          memoryContext: data.data.memoryContext,
          portfolioFetched: data.data.portfolioFetched,
          queryType: data.data.queryType
        };

        setMessages(prev => [...prev, botMessage]);
        
        // Show portfolio summary if available
        if (data.data.portfolioSummary && data.data.portfolioSummary.holdingsCount > 0) {
          console.log('📊 Portfolio Summary:', data.data.portfolioSummary);
        }
        
        // Log query optimization
        console.log(`Query type: ${data.data.queryType || 'unknown'}, Portfolio fetched: ${data.data.portfolioFetched || false}`);
      } else {
        throw new Error(data.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove portfolio loading message if there was an error
      setMessages(prev => prev.filter(msg => !msg.isPortfolioLoading));
      
      const isHindi = currentLanguage === 'hindi';
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: isHindi 
          ? 'क्षमा करें, कुछ तकनीकी समस्या है। कृपया फिर से कोशिश करें।'
          : 'Sorry, there was a technical issue. Please try again.',
        timestamp: new Date().toISOString(),
        sources: [],
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [currentLanguage, inputValue, isLoading]);

  const startListening = useCallback(() => {
    if (!voiceSupported || !recognition || isListening) return;
    
    // Stop any ongoing speech before listening
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
    
    try {
      // Update language for recognition based on speechLanguage setting
      recognition.lang = speechLanguage;
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }, [voiceSupported, recognition, isListening, speechLanguage]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
    }
  }, [recognition, isListening]);

  const toggleVoice = useCallback(() => {
    setIsVoiceEnabled(!isVoiceEnabled);
    
    // If disabling voice, stop any ongoing speech or listening
    if (isVoiceEnabled) {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
        setIsSpeaking(false);
      }
      if (recognition && isListening) {
        recognition.stop();
      }
    }
  }, [isVoiceEnabled, recognition, isListening]);

  const toggleSpeechLanguage = useCallback(() => {
    const newLang = speechLanguage === 'en-IN' ? 'hi-IN' : 'en-IN';
    setSpeechLanguage(newLang);
    console.log(`🎤 Speech recognition language changed to: ${newLang}`);
    
    // If currently listening, stop and restart with new language
    if (isListening && recognition) {
      recognition.stop();
      setTimeout(() => {
        if (recognition) {
          recognition.lang = newLang;
          recognition.start();
        }
      }, 100);
    }
  }, [speechLanguage, isListening, recognition]);

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick action buttons for portfolio queries
  const quickActions = [
    {
      text: currentLanguage === 'hindi' ? 'मेरा पोर्टफोलियो' : 'My Portfolio',
      query: currentLanguage === 'hindi' ? 'मेरे पोर्टफोलियो की स्थिति क्या है?' : 'What is the status of my portfolio?',
      icon: '📊'
    },
    {
      text: currentLanguage === 'hindi' ? 'लाभ-हानि' : 'Profit/Loss',
      query: currentLanguage === 'hindi' ? 'मेरा कुल लाभ या हानि कितना है?' : 'What is my total profit or loss?',
      icon: '💰'
    },
    {
      text: currentLanguage === 'hindi' ? 'बेहतरीन स्टॉक' : 'Best Performers',
      query: currentLanguage === 'hindi' ? 'मेरे पोर्टफोलियो में कौन से स्टॉक सबसे अच्छा प्रदर्शन कर रहे हैं?' : 'Which stocks are performing best in my portfolio?',
      icon: '📈'
    },
    {
      text: currentLanguage === 'hindi' ? 'निवेश सुझाव' : 'Investment Advice',
      query: currentLanguage === 'hindi' ? 'मेरे पोर्टफोलियो के अनुसार मुझे कहाँ निवेश करना चाहिए?' : 'Where should I invest based on my current portfolio?',
      icon: '💡'
    },
    {
      text: currentLanguage === 'hindi' ? 'आज के टॉप स्टॉक्स' : 'Today\'s Top Stocks',
      query: 'What are the top performing stocks today in Indian market?',
      icon: '🏆'
    },
    {
      text: currentLanguage === 'hindi' ? 'मार्केट न्यूज़' : 'Market News',
      query: 'What are the latest important stock market news today?',
      icon: '📰'
    }
  ];

  const handleQuickAction = (query) => {
    setInputValue(query);
    sendMessage(query);
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      <button 
        className={`chatbot-toggle ${isVisible ? 'active' : ''}`}
        onClick={() => setIsVisible(!isVisible)}
        title={currentLanguage === 'hindi' ? 'स्टॉक असिस्टेंट' : 'Stock Assistant'}
      >
        {isVisible ? '✕' : '🤖'}
      </button>

      {/* Chatbot Window */}
      {isVisible && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-title">
              <span className="chatbot-icon">🤖</span>
              <div>
                <h3><Trans>स्टॉक असिस्टेंट - Stock Assistant</Trans></h3>
                <span className="status-indicator">
                  <span className="status-dot"></span>
                  <Trans>ऑनलाइन - Online</Trans>
                  {isSpeaking && (
                    <span className="speaking-indicator">
                      🔊 <Trans>बोल रहा है - Speaking...</Trans>
                    </span>
                  )}
                </span>
              </div>
            </div>
            <div className="header-controls">
              {voiceSupported && (
                <>
                  <button 
                    className={`speech-lang-btn ${speechLanguage === 'hi-IN' ? 'hindi' : 'english'}`}
                    onClick={toggleSpeechLanguage}
                    title={speechLanguage === 'hi-IN' 
                      ? 'Switch to English Speech Input (Currently: Hindi)'
                      : 'Switch to Hindi Speech Input (Currently: English)'}
                  >
                    {speechLanguage === 'hi-IN' ? 'हि' : 'EN'}
                  </button>
                  <button 
                    className={`voice-toggle-btn ${isVoiceEnabled ? 'active' : ''}`}
                    onClick={toggleVoice}
                    title={currentLanguage === 'hindi' 
                      ? (isVoiceEnabled ? 'आवाज़ बंद करें' : 'आवाज़ चालू करें')
                      : (isVoiceEnabled ? 'Disable Voice' : 'Enable Voice')}
                  >
                    {isVoiceEnabled ? '🔊' : '🔇'}
                  </button>
                </>
              )}
              <button 
                className="close-btn"
                onClick={() => setIsVisible(false)}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Daily Tip */}
          {dailyTip && (
            <div className="daily-tip">
              <span className="tip-icon">💡</span>
              <span className="tip-text">{dailyTip}</span>
            </div>
          )}

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`message ${message.type} ${message.isPortfolioLoading ? 'portfolio-loading-message' : ''}`}
                data-portfolio-loading={message.isPortfolioLoading || false}
              >
                <div className="message-content">
                  {/* Query type indicator for bot messages */}
                  {message.type === 'bot' && message.queryType && !message.isPortfolioLoading && (
                    <div className={`query-type-indicator ${message.queryType}`}>
                      {message.queryType === 'portfolio-specific' ? '👤 Personal' : '🌐 General'}
                    </div>
                  )}
                  
                  <div className="message-text">
                    {message.text}
                    {message.isPortfolioLoading && (
                      <div className="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    )}
                  </div>
                  
                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="message-sources">
                      <div className="sources-label">
                        <Trans>स्रोत - Sources:</Trans>
                      </div>
                      <div className="sources-links">
                        {message.sources.map((source, index) => (
                          <a 
                            key={index}
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="source-link"
                          >
                            {source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Portfolio Summary */}
                  {message.portfolioSummary && message.portfolioSummary.holdingsCount > 0 && (
                    <div className="portfolio-summary">
                      <div className="portfolio-label">
                        📊 <Trans>पोर्टफोलियो - Portfolio Summary:</Trans>
                      </div>
                      <div className="portfolio-stats">
                        <span className="stat">
                          💰 ₹{message.portfolioSummary.totalValue.toLocaleString()}
                        </span>
                        <span className={`stat ${message.portfolioSummary.totalPnL >= 0 ? 'profit' : 'loss'}`}>
                          {message.portfolioSummary.totalPnL >= 0 ? '📈' : '📉'} 
                          ₹{Math.abs(message.portfolioSummary.totalPnL).toFixed(2)}
                        </span>
                        <span className="stat">
                          🏢 {message.portfolioSummary.holdingsCount} stocks
                        </span>
                      </div>
                      {(message.cacheUsed || message.memoryContext) && (
                        <div className="ai-status">
                          {message.cacheUsed && <span title="Using cached data">💾</span>}
                          {message.memoryContext > 0 && <span title={`Remembering ${message.memoryContext} previous conversations`}>🧠{message.memoryContext}</span>}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="message-time">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="message bot">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="quick-actions">
              <div className="quick-actions-label">
                <Trans>त्वरित प्रश्न - Quick Questions:</Trans>
              </div>
              <div className="quick-actions-grid">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    className="quick-action-btn"
                    onClick={() => handleQuickAction(action.query)}
                  >
                    <span className="action-icon">{action.icon}</span>
                    <span className="action-text">{action.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input">
            <div className="input-container">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening 
                  ? (currentLanguage === 'hindi' ? '🎤 सुन रहा है...' : '🎤 Listening...')
                  : (currentLanguage === 'hindi' 
                    ? 'स्टॉक मार्केट के बारे में कुछ पूछें...'
                    : 'Ask something about the stock market...')}
                disabled={isLoading || isListening}
                rows="1"
                maxLength="500"
              />
              <div className="input-buttons">
                {voiceSupported && (
                  <button 
                    className={`mic-btn ${isListening ? 'listening' : ''}`}
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading || isSpeaking}
                    title={speechLanguage === 'hi-IN'
                      ? (isListening ? 'हिंदी रिकॉर्डिंग बंद करें' : 'हिंदी में वॉइस इनपुट')
                      : (isListening ? 'Stop English Recording' : 'English Voice Input')}
                  >
                    {isListening ? '🔴' : '🎤'}
                  </button>
                )}
                <button 
                  onClick={() => sendMessage()}
                  disabled={!inputValue.trim() || isLoading || isListening}
                  className="send-btn"
                >
                  {isLoading ? '⏳' : '📤'}
                </button>
              </div>
            </div>
            <div className="input-footer">
              <span className="char-count">{inputValue.length}/500</span>
              {voiceSupported && (
                <span className="voice-status">
                  {!isVoiceEnabled ? (
                    <Trans>वॉइस उपलब्ध - Voice Available</Trans>
                  ) : isListening ? (
                    <span>
                      🎤 {speechLanguage === 'hi-IN' ? 'हिंदी में सुन रहा है - Listening in Hindi' : 'अंग्रेजी में सुन रहा है - Listening in English'}
                    </span>
                  ) : isSpeaking ? (
                    <Trans>🔊 बोल रहा है - Speaking...</Trans>
                  ) : (
                    <span>
                      ✅ {speechLanguage === 'hi-IN' ? 'हिंदी वॉइस तैयार - Hindi Voice Ready' : 'अंग्रेजी वॉइस तैयार - English Voice Ready'}
                    </span>
                  )}
                </span>
              )}
              <span className="powered-by">
                Powered by <strong>Gemini AI</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
