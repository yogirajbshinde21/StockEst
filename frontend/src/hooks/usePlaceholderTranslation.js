import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Custom hook for translating form placeholders
 * @param {string} placeholder - The English placeholder text
 * @returns {string} - The translated placeholder text
 */
export const usePlaceholderTranslation = (placeholder) => {
  const { translateText, currentLanguage } = useLanguage();
  const [translatedPlaceholder, setTranslatedPlaceholder] = useState(placeholder);

  useEffect(() => {
    if (currentLanguage === 'en') {
      setTranslatedPlaceholder(placeholder);
      return;
    }

    const translatePlaceholder = async () => {
      try {
        const translated = await translateText(placeholder, currentLanguage);
        setTranslatedPlaceholder(translated);
      } catch (error) {
        console.error('Placeholder translation error:', error);
        setTranslatedPlaceholder(placeholder);
      }
    };

    translatePlaceholder();
  }, [placeholder, currentLanguage, translateText]);

  return translatedPlaceholder;
};

export default usePlaceholderTranslation;
