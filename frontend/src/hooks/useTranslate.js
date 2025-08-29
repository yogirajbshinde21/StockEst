import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Custom hook for translating text
 * @param {string} text - The English text to translate
 * @param {Object} options - Translation options
 * @returns {Object} - { translatedText, isLoading, error }
 */
export const useTranslate = (text, options = {}) => {
  const { translateText, currentLanguage, isTranslating } = useLanguage();
  const [translatedText, setTranslatedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!text || currentLanguage === 'en') {
      setTranslatedText(text);
      setIsLoading(false);
      setError(null);
      return;
    }

    const performTranslation = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const result = await translateText(text, currentLanguage);
        setTranslatedText(result);
      } catch (err) {
        console.error('Translation hook error:', err);
        setError(err.message);
        setTranslatedText(text); // Fallback to original text
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce translation calls
    const debounceTimer = setTimeout(performTranslation, options.debounceMs || 100);
    
    return () => clearTimeout(debounceTimer);
  }, [text, currentLanguage, translateText, options.debounceMs]);

  return {
    translatedText,
    isLoading: isLoading || isTranslating,
    error
  };
};

/**
 * Hook for translating multiple texts at once
 * @param {Array} texts - Array of English texts to translate
 * @returns {Object} - { translatedTexts, isLoading, error }
 */
export const useTranslateBatch = (texts = []) => {
  const { translateBatch, currentLanguage } = useLanguage();
  const [translatedTexts, setTranslatedTexts] = useState(texts);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!texts.length || currentLanguage === 'en') {
      setTranslatedTexts(texts);
      setIsLoading(false);
      setError(null);
      return;
    }

    const performBatchTranslation = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const results = await translateBatch(texts, currentLanguage);
        setTranslatedTexts(results);
      } catch (err) {
        console.error('Batch translation error:', err);
        setError(err.message);
        setTranslatedTexts(texts); // Fallback to original texts
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(performBatchTranslation, 150);
    
    return () => clearTimeout(debounceTimer);
  }, [texts, currentLanguage, translateBatch]);

  return {
    translatedTexts,
    isLoading,
    error
  };
};

export default useTranslate;
