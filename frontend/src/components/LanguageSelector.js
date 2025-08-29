import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';
import './LanguageSelector.css';

const LanguageSelector = ({ className = '', showFullNames = false }) => {
  const { 
    currentLanguage, 
    changeLanguage, 
    supportedLanguages, 
    getCurrentLanguageInfo,
    isTranslating,
    translationError 
  } = useLanguage();
  
  const [isOpen, setIsOpen] = useState(false);
  const currentLangInfo = getCurrentLanguageInfo();

  const handleLanguageChange = (languageCode) => {
    changeLanguage(languageCode);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`language-selector ${className}`}>
      {/* Language Selector Button */}
      <button 
        className={`language-button ${isOpen ? 'active' : ''} ${isTranslating ? 'translating' : ''}`}
        onClick={toggleDropdown}
        title="Change Language / भाषा बदलें"
      >
        <Globe size={18} className="globe-icon" />
        <span className="current-language">
          {showFullNames ? currentLangInfo.nativeName : currentLangInfo.code.toUpperCase()}
        </span>
        <ChevronDown 
          size={16} 
          className={`chevron ${isOpen ? 'rotated' : ''}`} 
        />
        {isTranslating && (
          <span className="translation-indicator">⏳</span>
        )}
      </button>

      {/* Language Dropdown */}
      {isOpen && (
        <div className="language-dropdown">
          <div className="dropdown-header">
            <Globe size={16} />
            <span>Select Language</span>
          </div>
          
          <div className="language-list">
            {supportedLanguages.map((language) => (
              <button
                key={language.code}
                className={`language-option ${currentLanguage === language.code ? 'selected' : ''}`}
                onClick={() => handleLanguageChange(language.code)}
              >
                <div className="language-info">
                  <span className="language-name">{language.name}</span>
                  <span className="language-native">{language.nativeName}</span>
                </div>
                {currentLanguage === language.code && (
                  <Check size={16} className="check-icon" />
                )}
              </button>
            ))}
          </div>

          {translationError && (
            <div className="translation-error">
              <span>⚠️ {translationError}</span>
            </div>
          )}
          
          <div className="dropdown-footer">
            <span className="powered-by">Powered by Google Translate</span>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div 
          className="language-overlay" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default LanguageSelector;
