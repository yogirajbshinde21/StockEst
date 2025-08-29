import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Language Context
const LanguageContext = createContext();

// Supported languages for Indian users
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' }
];

// Translation cache to avoid repeated API calls
const translationCache = new Map();

// Common translations for financial terms (pre-defined to ensure accuracy)
const FINANCIAL_TRANSLATIONS = {
  // Navigation & UI
  'Stock Simulator': {
    'hi': 'स्टॉक सिमुलेटर',
    'te': 'స్టాక్ సిమ్యులేటర్',
    'ta': 'பங்கு சிமுலேட்டர்',
    'bn': 'স্টক সিমুলেটর',
    'mr': 'स्टॉक सिम्युलेटर',
    'gu': 'સ્ટોક સિમ્યુલેટર',
    'kn': 'ಸ್ಟಾಕ್ ಸಿಮ್ಯುಲೇಟರ್',
    'ml': 'സ്റ്റോക്ക് സിമുലേറ്റർ',
    'pa': 'ਸਟਾਕ ਸਿਮੂਲੇਟਰ'
  },
  'Portfolio': {
    'hi': 'पोर्टफोलियो',
    'te': 'పోర్ట్‌ఫోలియో',
    'ta': 'போர்ட்ஃபோலியோ',
    'bn': 'পোর্টফোলিও',
    'mr': 'पोर्टफोलिओ',
    'gu': 'પોર્ટફોલિયો',
    'kn': 'ಪೋರ್ಟ್‌ಫೋಲಿಯೋ',
    'ml': 'പോർട്ട്‌ഫോളിയോ',
    'pa': 'ਪੋਰਟਫੋਲੀਓ'
  },
  'Market': {
    'hi': 'बाजार',
    'te': 'మార్కెట్',
    'ta': 'சந்தை',
    'bn': 'বাজার',
    'mr': 'बाजार',
    'gu': 'બજાર',
    'kn': 'ಮಾರುಕಟ್ಟೆ',
    'ml': 'മാർക്കറ്റ്',
    'pa': 'ਮਾਰਕੀਟ'
  },
  'BUY': {
    'hi': 'खरीदें',
    'te': 'కొనండి',
    'ta': 'வாங்கு',
    'bn': 'কিনুন',
    'mr': 'खरेदी करा',
    'gu': 'ખરીદો',
    'kn': 'ಖರೀದಿಸಿ',
    'ml': 'വാങ്ങുക',
    'pa': 'ਖਰੀਦੋ'
  },
  'SELL': {
    'hi': 'बेचें',
    'te': 'అమ్మండి',
    'ta': 'விற்று',
    'bn': 'বিক্রি করুন',
    'mr': 'विक्री करा',
    'gu': 'વેચો',
    'kn': 'ಮಾರಿ',
    'ml': 'വിൽക്കുക',
    'pa': 'ਵੇਚੋ'
  },
  'Login': {
    'hi': 'लॉगिन',
    'te': 'లాగిన్',
    'ta': 'உள்நுழைவு',
    'bn': 'লগইন',
    'mr': 'लॉगिन',
    'gu': 'લૉગિન',
    'kn': 'ಲಾಗಿನ್',
    'ml': 'ലോഗിൻ',
    'pa': 'ਲਾਗਇਨ'
  },
  'Logout': {
    'hi': 'लॉगआउट',
    'te': 'లాగ్అవుట్',
    'ta': 'வெளியேறு',
    'bn': 'লগআউট',
    'mr': 'लॉगआउट',
    'gu': 'લૉગઆઉટ',
    'kn': 'ಲಾಗ್‌ಔಟ್',
    'ml': 'ലോഗൗട്ട്',
    'pa': 'ਲਾਗਆਉਟ'
  },
  'Welcome Back': {
    'hi': 'वापसी पर स्वागत है',
    'te': 'తిరిగి స్వాగతం',
    'ta': 'மீண்டும் வரவேற்கிறோம்',
    'bn': 'ফিরে আসার জন্য স্বাগতম',
    'mr': 'परत स्वागत आहे',
    'gu': 'પાછા આવવા બદલ સ્વાગત છે',
    'kn': 'ಮತ್ತೆ ಸ್ವಾಗತ',
    'ml': 'വീണ്ടും സ്വാഗതം',
    'pa': 'ਵਾਪਸੀ ਤੇ ਸੁਆਗਤ ਹੈ'
  },
  'Available Balance': {
    'hi': 'उपलब्ध राशि',
    'te': 'అందుబాటులో ఉన్న మొత్తం',
    'ta': 'கிடைக்கும் தொகை',
    'bn': 'উপলব্ধ ব্যালেন্স',
    'mr': 'उपलब्ध शिल्लक',
    'gu': 'ઉપલબ્ધ બેલેન્સ',
    'kn': 'ಲಭ್ಯವಿರುವ ಬ್ಯಾಲೆನ್ಸ್',
    'ml': 'ലഭ്യമായ ബാലൻസ്',
    'pa': 'ਉਪਲਬਧ ਬਕਾਇਆ'
  },
  'Total Invested': {
    'hi': 'कुल निवेश',
    'te': 'మొత్తం పెట్టుబడి',
    'ta': 'மொத்த முதலீடు',
    'bn': 'মোট বিনিয়োগ',
    'mr': 'एकूण गुंतवणूक',
    'gu': 'કુલ રોકાણ',
    'kn': 'ಒಟ್ಟು ಹೂಡಿಕೆ',
    'ml': 'ആകെ നിക്ഷേപം',
    'pa': 'ਕੁੱਲ ਨਿਵੇਸ਼'
  },
  'Current Price': {
    'hi': 'वर्तमान मूल्य',
    'te': 'ప్రస్తుత ధర',
    'ta': 'தற்போதைய விலை',
    'bn': 'বর্তমান দাম',
    'mr': 'सध्याची किंमत',
    'gu': 'વર્તમાન કિંમત',
    'kn': 'ಪ್ರಸ್ತುತ ಬೆಲೆ',
    'ml': 'ഇപ്പോഴത്തെ വില',
    'pa': 'ਮੌਜੂਦਾ ਕੀਮਤ'
  },
  'Live': {
    'hi': 'लाइव',
    'te': 'లైవ్',
    'ta': 'நேரலை',
    'bn': 'লাইভ',
    'mr': 'लाइव्ह',
    'gu': 'લાઇવ',
    'kn': 'ಲೈವ್',
    'ml': 'ലൈവ്',
    'pa': 'ਲਾਈਵ'
  },
  'Refresh': {
    'hi': 'ताज़ा करें',
    'te': 'రిఫ్రెష్',
    'ta': 'புதுப்பிக்கவும்',
    'bn': 'রিফ্রেশ',
    'mr': 'रीफ्रेश',
    'gu': 'રિફ્રેશ',
    'kn': 'ರಿಫ್ರೆಶ್',
    'ml': 'പുതുക്കുക',
    'pa': 'ਰਿਫ੍ਰੈਸ਼'
  }
};

// Browser-based translation using Google Translate (free tier)
const translateWithGoogleAPI = async (text, targetLang) => {
  try {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
    const data = await response.json();
    return data[0]?.[0]?.[0] || text;
  } catch (error) {
    console.warn('Translation API failed:', error);
    return text;
  }
};

// Language Provider Component
export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);

  // Load saved language preference on app start
  useEffect(() => {
    const savedLanguage = localStorage.getItem('stockest-language');
    if (savedLanguage && SUPPORTED_LANGUAGES.find(lang => lang.code === savedLanguage)) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  // Save language preference when changed
  const changeLanguage = useCallback((languageCode) => {
    setCurrentLanguage(languageCode);
    localStorage.setItem('stockest-language', languageCode);
    setTranslationError(null);
  }, []);

  // Main translation function
  const translateText = useCallback(async (text, targetLanguage = currentLanguage) => {
    // Return original text if target is English or empty
    if (targetLanguage === 'en' || !text || text.trim() === '') {
      return text;
    }

    // Check pre-defined translations first (for accuracy)
    if (FINANCIAL_TRANSLATIONS[text] && FINANCIAL_TRANSLATIONS[text][targetLanguage]) {
      return FINANCIAL_TRANSLATIONS[text][targetLanguage];
    }

    // Check cache
    const cacheKey = `${text}-${targetLanguage}`;
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }

    try {
      setIsTranslating(true);
      setTranslationError(null);

      // Use Google Translate API
      const translatedText = await translateWithGoogleAPI(text, targetLanguage);
      
      // Cache the translation
      translationCache.set(cacheKey, translatedText);
      
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationError('Translation service temporarily unavailable');
      
      // Return original text on error
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, [currentLanguage]);

  // Batch translate multiple texts (for better performance)
  const translateBatch = useCallback(async (texts, targetLanguage = currentLanguage) => {
    if (targetLanguage === 'en') {
      return texts;
    }

    const translations = await Promise.all(
      texts.map(text => translateText(text, targetLanguage))
    );

    return translations;
  }, [currentLanguage, translateText]);

  // Get current language info
  const getCurrentLanguageInfo = useCallback(() => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === currentLanguage) || SUPPORTED_LANGUAGES[0];
  }, [currentLanguage]);

  // Context value
  const value = {
    currentLanguage,
    changeLanguage,
    translateText,
    translateBatch,
    isTranslating,
    translationError,
    getCurrentLanguageInfo,
    supportedLanguages: SUPPORTED_LANGUAGES
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
