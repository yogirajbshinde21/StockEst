import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../config/api';
import Trans from './Trans';
import './ChatBot.css';

// Voice language mappings for Indian languages
const VOICE_LANGUAGES = [
  { code: 'en-IN', name: 'English', nativeName: 'English', shortName: 'EN', backendCode: 'english' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिंदी', shortName: 'हि', backendCode: 'hindi' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', shortName: 'తె', backendCode: 'telugu' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', shortName: 'த', backendCode: 'tamil' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', shortName: 'বং', backendCode: 'bengali' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', shortName: 'म', backendCode: 'marathi' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', shortName: 'ગુ', backendCode: 'gujarati' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', shortName: 'ಕ', backendCode: 'kannada' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', shortName: 'മ', backendCode: 'malayalam' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', shortName: 'ਪੰ', backendCode: 'punjabi' }
];

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
  const [speechLanguageIndex, setSpeechLanguageIndex] = useState(0); // Index for VOICE_LANGUAGES array
  const speechSynthesisRef = useRef(null);

  // Helper to get current voice language
  const currentVoiceLanguage = VOICE_LANGUAGES[speechLanguageIndex];

  // Handle voice input - defined early to avoid dependency issues
  const handleVoiceInput = useCallback((transcript, detectedLanguage = null) => {
    // Find the voice language config based on detected language
    const voiceConfig = VOICE_LANGUAGES.find(lang => lang.code === detectedLanguage) || VOICE_LANGUAGES[0];
    const voiceLanguage = voiceConfig.backendCode;
    
    console.log(`🎤 Voice input detected:`, {
      transcript,
      detectedLanguage,
      voiceLanguage,
      languageName: voiceConfig.name
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

        const response = await fetch(`${API_BASE_URL}/api/chatbot/query`, {
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
              
              // Use the language that was detected from voice input for TTS
              const ttsLanguage = detectedLanguage || voiceConfig.code;
              
              // Try to find a suitable voice for the language
              const voices = speechSynthesisRef.current.getVoices();
              
              // Voice fallback strategy for better support
              const findBestVoice = (targetLang) => {
                // 1. Try exact match
                let voice = voices.find(v => v.lang === targetLang);
                if (voice) return voice;
                
                // 2. Try language family match (e.g., 'mr' from 'mr-IN')
                const langCode = targetLang.split('-')[0];
                voice = voices.find(v => v.lang.startsWith(langCode));
                if (voice) return voice;
                
                // 3. For Devanagari script languages (Hindi, Marathi, Nepali), use Hindi voice
                if (['mr', 'hi', 'ne'].includes(langCode)) {
                  voice = voices.find(v => v.lang.startsWith('hi'));
                  if (voice) return voice;
                }
                
                // 4. For other Indian languages, try any Indian English voice
                if (targetLang.includes('-IN')) {
                  voice = voices.find(v => v.lang === 'en-IN');
                  if (voice) return voice;
                }
                
                // 5. Fallback to any English voice
                voice = voices.find(v => v.lang.startsWith('en'));
                if (voice) return voice;
                
                // 6. Last resort - use default voice
                return voices[0] || null;
              };
              
              const selectedVoice = findBestVoice(ttsLanguage);
              
              if (selectedVoice) {
                utterance.voice = selectedVoice;
                utterance.lang = selectedVoice.lang;
                console.log(`🔊 Using voice: ${selectedVoice.name} (${selectedVoice.lang}) for ${ttsLanguage}`);
              } else {
                // Fallback language settings for better pronunciation
                utterance.lang = ttsLanguage;
                console.log(`⚠️ No suitable voice found, using system default for ${ttsLanguage}`);
              }
              
              utterance.rate = 0.9;
              utterance.pitch = 1.0;
              utterance.volume = 1.0;
              
              utterance.onstart = () => {
                setIsSpeaking(true);
                console.log(`🔊 Speaking in ${voiceConfig.name} (${ttsLanguage})`);
              };
              utterance.onend = () => {
                console.log(`✅ Finished speaking in ${voiceConfig.name}`);
                setIsSpeaking(false);
              };
              utterance.onerror = (event) => {
                console.error('TTS Error:', event.error);
                console.log(`❌ TTS failed for ${voiceConfig.name}, trying fallback...`);
                setIsSpeaking(false);
                
                // Try again with English fallback if original failed
                if (utterance.lang !== 'en-US' && utterance.lang !== 'en-IN') {
                  setTimeout(() => {
                    const fallbackUtterance = new SpeechSynthesisUtterance(cleanText);
                    fallbackUtterance.lang = 'en-US';
                    fallbackUtterance.rate = 0.9;
                    fallbackUtterance.onstart = () => console.log('🔊 Using English fallback voice');
                    fallbackUtterance.onerror = (err) => console.error('Fallback TTS also failed:', err);
                    speechSynthesisRef.current.speak(fallbackUtterance);
                  }, 100);
                }
              };
              
              try {
                speechSynthesisRef.current.speak(utterance);
                console.log(`🎯 TTS initiated for: "${cleanText.substring(0, 50)}..."`);
              } catch (error) {
                console.error('Failed to initiate TTS:', error);
              }
            }
          }
        } else {
          throw new Error(data.message || 'Failed to get response');
        }
      } catch (error) {
        console.error('Error sending voice message:', error);
        
        const errorMessages = {
          'english': 'Sorry, there was a technical issue. Please try again.',
          'hindi': 'क्षमा करें, कुछ तकनीकी समस्या है। कृपया फिर से कोशिश करें।',
          'telugu': 'క్షమించండి, కొంత సాంకేతిక సమస్య ఉంది. దయచేసి మళ్లీ ప్రయత్నించండి.',
          'tamil': 'மன்னிக்கவும், சில தொழில்நுட்ப சிக்கல் உள்ளது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
          'bengali': 'দুঃখিত, কিছু প্রযুক্তিগত সমস্যা আছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
          'marathi': 'क्षमस्व, काही तांत्रिक समस्या आहे. कृपया पुन्हा प्रयत्न करा.',
          'gujarati': 'માફ કરશો, કોઈ તકનીકી સમસ્યા છે. કૃપા કરીને ફરીથી પ્રયાસ કરો.',
          'kannada': 'ಕ್ಷಮಿಸಿ, ಸ್ವಲ್ಪ ತಾಂತ್ರಿಕ ಸಮಸ್ಯೆ ಇದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
          'malayalam': 'ക്ഷമിക്കണം, കുറച്ച് സാങ്കേതിക പ്രശ്‌നമുണ്ട്. ദയവായി വീണ്ടും ശ്രമിക്കുക.',
          'punjabi': 'ਮਾਫ਼ ਕਰਨਾ, ਕੁਝ ਤਕਨੀਕੀ ਸਮੱਸਿਆ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
        };
        
        const errorMessage = {
          id: Date.now() + 1,
          type: 'bot',
          text: errorMessages[voiceLanguage] || errorMessages['english'],
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
      recognitionInstance.lang = currentVoiceLanguage.code;
      
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
      
      // Ensure voices are loaded
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        console.log('📢 Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        
        // Log specific language support
        const supportedLangs = ['hi-IN', 'mr-IN', 'en-IN', 'en-US'];
        supportedLangs.forEach(lang => {
          const voice = voices.find(v => v.lang === lang);
          if (voice) {
            console.log(`✅ ${lang} supported: ${voice.name}`);
          } else {
            console.log(`❌ ${lang} not supported`);
          }
        });
      };
      
      // Load voices immediately if available
      loadVoices();
      
      // Also load voices when they become available (some browsers load them asynchronously)
      speechSynthesis.onvoiceschanged = loadVoices;
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
  }, [currentLanguage, handleVoiceInput, currentVoiceLanguage.code]);

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

      const response = await fetch(`${API_BASE_URL}/api/chatbot/query`, {
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
      // Update language for recognition based on current voice language setting
      recognition.lang = currentVoiceLanguage.code;
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }, [voiceSupported, recognition, isListening, currentVoiceLanguage.code]);

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
    const nextIndex = (speechLanguageIndex + 1) % VOICE_LANGUAGES.length;
    setSpeechLanguageIndex(nextIndex);
    const newLanguage = VOICE_LANGUAGES[nextIndex];
    
    console.log(`🎤 Speech recognition language changed to: ${newLanguage.name} (${newLanguage.code})`);
    
    // If currently listening, stop and restart with new language
    if (isListening && recognition) {
      recognition.stop();
      setTimeout(() => {
        if (recognition) {
          recognition.lang = newLanguage.code;
          recognition.start();
        }
      }, 100);
    }
  }, [speechLanguageIndex, isListening, recognition]);

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
                    className={`speech-lang-btn lang-${currentVoiceLanguage.code.split('-')[0]}`}
                    onClick={toggleSpeechLanguage}
                    title={`Voice: ${currentVoiceLanguage.name} (${currentVoiceLanguage.nativeName}) - Click to switch to next language`}
                  >
                    {currentVoiceLanguage.shortName}
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
                    title={isListening 
                      ? `Stop ${currentVoiceLanguage.name} Recording`
                      : `${currentVoiceLanguage.name} Voice Input`}
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
                      🎤 Listening in {currentVoiceLanguage.name} ({currentVoiceLanguage.nativeName})
                    </span>
                  ) : isSpeaking ? (
                    <Trans>🔊 बोल रहा है - Speaking...</Trans>
                  ) : (
                    <span>
                      ✅ {currentVoiceLanguage.name} Voice Ready ({currentVoiceLanguage.nativeName})
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
