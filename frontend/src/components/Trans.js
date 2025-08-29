import React from 'react';
import { useTranslate } from '../hooks/useTranslate';

/**
 * Trans Component - Automatically translates text content
 * @param {Object} props - Component props
 * @param {string} props.children - The English text to translate
 * @param {string} props.as - HTML element type (default: 'span')
 * @param {string} props.className - CSS classes
 * @param {Object} props.style - Inline styles
 * @param {boolean} props.showLoader - Show loading indicator during translation
 * @param {string} props.fallback - Fallback text if translation fails
 * @returns {JSX.Element} - Translated text wrapped in specified element
 */
const Trans = ({ 
  children, 
  as: Element = 'span', 
  className = '', 
  style = {}, 
  showLoader = false,
  fallback = null,
  ...otherProps 
}) => {
  const { translatedText, isLoading, error } = useTranslate(children);

  // Handle loading state
  if (isLoading && showLoader) {
    return (
      <Element className={`${className} trans-loading`} style={style} {...otherProps}>
        <span className="translation-spinner">⏳</span>
        {children}
      </Element>
    );
  }

  // Handle error state
  if (error && fallback) {
    return (
      <Element className={`${className} trans-error`} style={style} {...otherProps}>
        {fallback}
      </Element>
    );
  }

  // Return translated or original text
  return (
    <Element className={className} style={style} {...otherProps}>
      {translatedText || children}
    </Element>
  );
};

/**
 * Higher-order component to wrap components with translation
 * @param {React.Component} WrappedComponent - Component to wrap
 * @returns {React.Component} - Component with translation support
 */
export const withTranslation = (WrappedComponent) => {
  return function TranslatedComponent(props) {
    return (
      <div className="translated-component">
        <WrappedComponent {...props} />
      </div>
    );
  };
};

/**
 * Button component with built-in translation
 */
export const TransButton = ({ children, className = '', ...props }) => {
  return (
    <Trans as="button" className={`btn ${className}`} {...props}>
      {children}
    </Trans>
  );
};

/**
 * Heading component with built-in translation
 */
export const TransHeading = ({ children, level = 1, className = '', ...props }) => {
  const HeadingTag = `h${level}`;
  return (
    <Trans as={HeadingTag} className={className} {...props}>
      {children}
    </Trans>
  );
};

/**
 * Label component with built-in translation
 */
export const TransLabel = ({ children, className = '', ...props }) => {
  return (
    <Trans as="label" className={`form-label ${className}`} {...props}>
      {children}
    </Trans>
  );
};

/**
 * Paragraph component with built-in translation
 */
export const TransParagraph = ({ children, className = '', ...props }) => {
  return (
    <Trans as="p" className={className} {...props}>
      {children}
    </Trans>
  );
};

/**
 * Span component with built-in translation (default Trans behavior)
 */
export const TransSpan = ({ children, className = '', ...props }) => {
  return (
    <Trans as="span" className={className} {...props}>
      {children}
    </Trans>
  );
};

export default Trans;
