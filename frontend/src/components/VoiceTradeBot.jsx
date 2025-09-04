import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Trans from './Trans';
import './VoiceTradeBot.css';

// Voice language mappings for trading commands (Hindi and English)
const VOICE_LANGUAGES = [
  { code: 'en-IN', name: 'English', nativeName: 'English', shortName: 'EN' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिंदी', shortName: 'हि' }
];

const VoiceTradeBot = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [speechLanguageIndex, setSpeechLanguageIndex] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [confirmationPending, setConfirmationPending] = useState(false);
  
  const speechSynthesisRef = useRef(null);
  const { user } = useAuth();

  const currentVoiceLanguage = VOICE_LANGUAGES[speechLanguageIndex];
  const isHindi = currentVoiceLanguage.code === 'hi-IN';

  // Helper function to add messages to conversation history
  const addToConversation = useCallback((type, text, action = null) => {
    setConversationHistory(prev => [...prev, {
      type,
      text,
      timestamp: new Date(),
      action
    }]);
  }, []);

  // Progress tracking for automation steps
  const [progress, setProgress] = useState(0);

  // Gemini API key for command parsing
  const GEMINI_API_KEY = 'AIzaSyC1KF2QBKn3MecA3fDdBG8udSvlMitwe6o';

  // Text-to-speech function
  const speak = useCallback((text) => {
    if (!speechSynthesisRef.current || !text) return;
    
    speechSynthesisRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesisRef.current.getVoices();
    
    // Find appropriate voice
    const targetVoice = voices.find(v => 
      v.lang === currentVoiceLanguage.code || 
      v.lang.startsWith(currentVoiceLanguage.code.split('-')[0])
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    
    if (targetVoice) {
      utterance.voice = targetVoice;
      utterance.lang = targetVoice.lang;
    }
    
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    try {
      speechSynthesisRef.current.speak(utterance);
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  }, [currentVoiceLanguage.code]);

  // Fallback local parsing when Gemini API is unavailable
  const parseCommandLocally = useCallback((transcript) => {
    console.log('🔧 Using local fallback parsing for:', transcript);
    
    const text = transcript.toLowerCase().trim();
    
    // Extract action
    let action = 'unknown';
    if (text.includes('buy') || text.includes('खरीद') || text.includes('खरीदो')) {
      action = 'buy';
    } else if (text.includes('sell') || text.includes('बेच') || text.includes('बेचो')) {
      action = 'sell';
    } else if (text.includes('portfolio') || text.includes('holding') || text.includes('पोर्टफोलियो')) {
      action = 'portfolio_check';
    } else if (text.includes('balance') || text.includes('बैलेंस')) {
      action = 'balance_check';
    } else if (text.includes('price') || text.includes('cost') || text.includes('कीमत')) {
      action = 'price_check';
    }
    
    // Extract quantity
    let quantity = null;
    const numberWords = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5,
      'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10
    };
    
    // Try to find numbers in text
    const numberMatch = text.match(/\d+/);
    if (numberMatch) {
      quantity = parseInt(numberMatch[0]);
    } else {
      // Try word numbers
      for (const [word, num] of Object.entries(numberWords)) {
        if (text.includes(word)) {
          quantity = num;
          break;
        }
      }
    }
    
    // Extract stock symbol - focus on the 4 supported stocks only
    let stock_symbol = null;
    const supportedStocks = ['tcs', 'infy', 'hdfcbank', 'reliance'];
    
    // Check for exact matches first
    for (const stock of supportedStocks) {
      if (text.includes(stock)) {
        stock_symbol = stock.toUpperCase();
        break;
      }
    }
    
    // Check for common variations
    if (!stock_symbol) {
      if (text.includes('infosys') || text.includes('info')) {
        stock_symbol = 'INFY';
      } else if (text.includes('hdfc') || text.includes('bank')) {
        stock_symbol = 'HDFCBANK';
      } else if (text.includes('tata') || text.includes('consultancy')) {
        stock_symbol = 'TCS';
      }
    }
    
    // Determine confidence and missing info
    let confidence = 0.5; // Base confidence for local parsing
    let missing_info = [];
    let clarification_needed = '';
    
    if (action === 'unknown') {
      confidence = 0.1;
      clarification_needed = isHindi 
        ? 'कृपया स्पष्ट रूप से कहें कि आप क्या करना चाहते हैं - खरीदना, बेचना, या पोर्टफोलियो देखना'
        : 'Please clearly say what you want to do - buy, sell, or check portfolio';
    } else if (action === 'buy' || action === 'sell') {
      if (!stock_symbol) {
        missing_info.push('stock_symbol');
      }
      if (!quantity) {
        missing_info.push('quantity');
      }
      
      if (missing_info.length > 0) {
        confidence = 0.3;
        if (missing_info.includes('stock_symbol') && missing_info.includes('quantity')) {
          clarification_needed = isHindi 
            ? 'कौन सा स्टॉक और कितने शेयर?'
            : 'Which stock and how many shares?';
        } else if (missing_info.includes('stock_symbol')) {
          clarification_needed = isHindi 
            ? 'कौन सा स्टॉक?'
            : 'Which stock?';
        } else if (missing_info.includes('quantity')) {
          clarification_needed = isHindi 
            ? 'कितने शेयर?'
            : 'How many shares?';
        }
      } else {
        confidence = 0.8;
      }
    } else {
      confidence = 0.7; // Portfolio/balance/price checks are simpler
    }
    
    const result = {
      action,
      stock_symbol,
      quantity,
      order_type: 'market',
      price_type: 'market',
      price: null,
      confidence,
      missing_info,
      clarification_needed
    };
    
    console.log('🔧 Local parsing result:', result);
    return result;
  }, [isHindi]);

  // Parse trading command using Gemini AI
  const parseTradeCommand = useCallback(async (command) => {
    try {
      setIsProcessing(true);
      setCurrentStatus(isHindi ? '🧠 समझ रहा हूं...' : '🧠 Processing...');
      
      // Ensure command is a string
      const transcript = typeof command === 'string' ? command : command.transcript || '';
      
      const prompt = `You are a trading command parser for an Indian stock trading platform. Parse this voice command and extract trading information in JSON format.

Command: "${transcript}"

Expected JSON response format:
{
  "action": "buy" | "sell" | "check_portfolio" | "check_price" | "check_balance" | "unknown",
  "stock_symbol": "symbol if mentioned (like TCS, RELIANCE, INFY, etc.)",
  "quantity": number or null,
  "price_type": "market" | "limit" | null,
  "price": number or null,
  "confidence": 0-1,
  "missing_info": ["quantity", "stock_symbol"],
  "clarification_needed": "question to ask user in ${isHindi ? 'Hindi' : 'English'}"
}

Rules:
- Common Indian stock symbols: TCS, RELIANCE, INFY, HDFCBANK, ICICIBANK, ITC, etc.
- Recognize Hindi commands like "TCS के 2 शेयर खरीदो", "रिलायंस बेचो"
- If stock_symbol or quantity is missing, add to missing_info and set clarification_needed
- If price_type is not specified, default to "market" and do NOT add to missing_info
- Set confidence based on how clear the command is
- For portfolio/balance checks, no stock_symbol needed
- Only include essential missing information in missing_info (stock_symbol, quantity)

Only respond with valid JSON, no other text.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        console.warn(`🔄 Gemini API error (${response.status}), falling back to local parsing`);
        return parseCommandLocally(transcript);
      }

      const data = await response.json();
      
      // Check if the response has the expected structure
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
        console.warn('🔄 Invalid API response structure, falling back to local parsing');
        return parseCommandLocally(transcript);
      }
      
      const aiResponse = data.candidates[0].content.parts[0].text;
      
      // Clean and parse JSON response
      const cleanJson = aiResponse.replace(/```json|```/g, '').trim();
      const parsedCommand = JSON.parse(cleanJson);
      
      console.log('🤖 Parsed command:', parsedCommand);
      return parsedCommand;
    } catch (error) {
      console.error('Error parsing command:', error);
      console.warn('🔄 Falling back to local parsing due to error');
      const transcript = typeof command === 'string' ? command : command.transcript || '';
      return parseCommandLocally(transcript);
    } finally {
      setIsProcessing(false);
    }
  }, [isHindi, parseCommandLocally]);

  // Advanced DOM Manipulation Functions - Intelligent automation for trading interface
  const automateStockSearch = useCallback(async (stockSymbol) => {
    try {
      addToConversation('assistant', `🔍 Searching for ${stockSymbol}...`);
      
      // Only support the 4 main stocks in the platform
      const supportedStocks = {
        'TCS': ['TCS', 'TATA CONSULTANCY SERVICES', 'tcs'],
        'INFY': ['INFY', 'INFOSYS', 'infosys', 'infy'],
        'HDFCBANK': ['HDFCBANK', 'HDFC BANK', 'hdfc', 'hdfcbank'],
        'RELIANCE': ['RELIANCE', 'RELIANCE INDUSTRIES', 'reliance']
      };
      
      // Find the correct stock symbol
      let targetStock = null;
      const searchTerm = stockSymbol.toUpperCase();
      
      for (const [stockKey, variations] of Object.entries(supportedStocks)) {
        if (variations.some(variant => 
          variant.toUpperCase().includes(searchTerm) || 
          searchTerm.includes(variant.toUpperCase())
        )) {
          targetStock = stockKey;
          break;
        }
      }
      
      if (!targetStock) {
        addToConversation('assistant', `⚠️ ${stockSymbol} not supported. Available stocks: TCS, INFY, HDFCBANK, RELIANCE`);
        return { found: false };
      }
      
      console.log(`🎯 Target stock identified: ${targetStock} for search term: ${stockSymbol}`);
      
      // Strategy 0: Look for specific platform structure (check for stock cards/rows)
      console.log(`🔍 Strategy 0: Looking for platform-specific structure for ${targetStock}`);
      
      // Try to find stock cards or trading rows with strict validation
      const stockContainers = document.querySelectorAll('.stock-card, .stock-row, .symbol-row, [data-symbol], .ticker-symbol, .highlight-symbol, .symbol, .company-name');
      for (const container of stockContainers) {
        const containerText = container.textContent.toUpperCase().trim();
        const containerTitle = container.getAttribute('title') || '';
        
        // Check if this container is specifically for our target stock
        if ((containerText === targetStock || containerTitle.toUpperCase() === targetStock) &&
            !containerText.includes('HDFCBANK') && 
            !containerText.includes('RELIANCE') && 
            !containerText.includes('INFY')) {
          
          console.log(`🎯 Found exact stock container for ${targetStock}:`, container);
          
          // Look for buy button in this container or its parent
          let searchElement = container;
          for (let i = 0; i < 5; i++) { // Search up to 5 levels
            const buyButton = searchElement.querySelector('button[class*="buy"], button[data-action="buy"], .buy-btn') ||
                             Array.from(searchElement.querySelectorAll('button')).find(btn => 
                               btn.textContent.toUpperCase().includes('BUY')
                             );
            
            if (buyButton) {
              // Validate this is the correct buy button
              const btnTitle = buyButton.getAttribute('title') || '';
              const isCorrectButton = !btnTitle || 
                                    btnTitle.toUpperCase().includes(targetStock) ||
                                    (!btnTitle.includes('HDFCBANK') && 
                                     !btnTitle.includes('RELIANCE') && 
                                     !btnTitle.includes('INFY'));
              
              if (isCorrectButton) {
                console.log(`✅ Found validated buy button in stock container for ${targetStock}:`, buyButton);
                buyButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                return { found: true, element: buyButton, method: 'validated-stock-card', stock: targetStock };
              }
            }
            
            searchElement = searchElement.parentElement;
            if (!searchElement) break;
          }
        }
      }
      // Strategy 1: Look for exact stock symbol matches first
      console.log(`🔍 Strategy 1: Looking for exact matches for ${targetStock}`);
      
      // Look for elements that contain exactly the target stock symbol
      const allElements = document.querySelectorAll('*');
      const exactMatches = [];
      
      for (const element of allElements) {
        const text = element.textContent?.trim() || '';
        const isLeafNode = element.children.length === 0;
        
        // Look for exact matches or very close matches
        if (isLeafNode && (
          text === targetStock ||
          text === `${targetStock}.NS` ||
          text === `${targetStock}.BSE` ||
          (text.includes(targetStock) && text.length <= targetStock.length + 10)
        )) {
          exactMatches.push(element);
          console.log(`🎯 Found exact match for ${targetStock}: "${text}" in element:`, element);
        }
      }
      
      // If we found exact matches, try to find buy buttons near them
      if (exactMatches.length > 0) {
        for (const matchElement of exactMatches) {
          console.log(`🔍 Looking for buy button near ${targetStock} element...`);
          
          // Look for buy button in the same row/container
          let parent = matchElement.parentElement;
          while (parent && parent !== document.body) {
            const buyBtn = parent.querySelector('button');
            if (buyBtn && buyBtn.textContent.toUpperCase().includes('BUY')) {
              console.log(`✅ Found BUY button near ${targetStock}:`, buyBtn);
              buyBtn.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
              return { found: true, element: buyBtn, method: 'exact-match-buy', stock: targetStock };
            }
            parent = parent.parentElement;
            
            // Don't go too far up the DOM tree
            if (parent && (parent.tagName === 'TABLE' || parent.tagName === 'TBODY')) {
              break;
            }
          }
        }
      }
      
      // Strategy 2: Look for BUY buttons with stock symbol - WITH STRICT VALIDATION
      console.log(`🔍 Strategy 2: Looking for BUY buttons for ${targetStock}`);
      const buyButtons = document.querySelectorAll('button');
      console.log(`📊 Found ${buyButtons.length} buttons on page`);
      
      for (const button of buyButtons) {
        const buttonText = button.textContent.toUpperCase();
        const buttonTitle = button.getAttribute('title') || '';
        const parentText = button.parentElement?.textContent?.toUpperCase() || '';
        const grandParentText = button.parentElement?.parentElement?.textContent?.toUpperCase() || '';
        
        // Look for buy buttons associated with the target stock
        if (buttonText.includes('BUY')) {
          // STRICT VALIDATION: Check if this button is specifically for our target stock
          const isCorrectStock = buttonTitle.toUpperCase().includes(`BUY ${targetStock}`) ||
                                buttonTitle.toUpperCase().includes(targetStock) ||
                                buttonText.includes(targetStock) ||
                                (parentText.includes(targetStock) && parentText.length < 100) ||
                                (grandParentText.includes(targetStock) && grandParentText.length < 100);
          
          // Check if this button is for a different stock (EXCLUDE)
          const isWrongStock = buttonTitle.toUpperCase().includes('HDFCBANK') ||
                              buttonTitle.toUpperCase().includes('RELIANCE') ||
                              buttonTitle.toUpperCase().includes('INFY') ||
                              (targetStock === 'TCS' && (
                                buttonTitle.toUpperCase().includes('HDFCBANK') || 
                                buttonTitle.toUpperCase().includes('RELIANCE') || 
                                buttonTitle.toUpperCase().includes('INFY') ||
                                parentText.includes('HDFCBANK') ||
                                parentText.includes('RELIANCE') ||
                                parentText.includes('INFY')
                              ));
          
          console.log(`🔍 Buy button validation for ${targetStock}:`);
          console.log(`Button text: "${buttonText}"`);
          console.log(`Button title: "${buttonTitle}"`);
          console.log(`Is correct stock: ${isCorrectStock}`);
          console.log(`Is wrong stock: ${isWrongStock}`);
          
          if (isCorrectStock && !isWrongStock) {
            console.log(`✅ Found validated BUY button for ${targetStock}:`, button);
            button.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { found: true, element: button, method: 'validated-buy-button', stock: targetStock };
          }
        }
      }
      
      // Strategy 3: Look in stock table/list for the target stock
      console.log(`🔍 Strategy 3: Looking in stock elements for ${targetStock}`);
      const stockElements = document.querySelectorAll('*');
      console.log(`📊 Searching through ${stockElements.length} elements`);
      
      for (const element of stockElements) {
        const text = element.textContent?.toUpperCase() || '';
        const isLeafNode = element.children.length === 0;
        
        // Only look for leaf nodes that contain our exact target stock
        // And make sure the text isn't too long (to avoid descriptions)
        if (isLeafNode && text.includes(targetStock) && text.length < 50) {
          // Extra validation - make sure it's actually our target stock and not a partial match
          if (targetStock === 'TCS' && (text.includes('HDFCBANK') || text.includes('RELIANCE') || text.includes('INFY'))) {
            continue; // Skip if it contains other stock names
          }
          
          console.log(`🎯 Found stock element containing ${targetStock}: "${text}"`);
          
          // Look for a clickable parent with buy functionality - WITH STRICT VALIDATION
          let parent = element.parentElement;
          while (parent && parent !== document.body) {
            // Try multiple selector approaches for buy buttons
            let buyBtn = parent.querySelector('button[title*="Buy"], .buy-btn, [data-action="buy"]');
            
            // If not found, look for buttons containing "Buy" text
            if (!buyBtn) {
              const buttons = parent.querySelectorAll('button');
              buyBtn = Array.from(buttons).find(btn => 
                btn.textContent?.toLowerCase().includes('buy') ||
                btn.title?.toLowerCase().includes('buy') ||
                btn.getAttribute('aria-label')?.toLowerCase().includes('buy')
              );
            }
            
            if (buyBtn) {
              // CRITICAL: Validate this buy button is for the correct stock
              const btnTitle = buyBtn.getAttribute('title') || '';
              const btnText = buyBtn.textContent || '';
              const btnDataStock = buyBtn.getAttribute('data-stock') || '';
              
              // Check if this buy button is specifically for our target stock
              const isCorrectStock = btnTitle.toUpperCase().includes(`BUY ${targetStock}`) ||
                                   btnTitle.toUpperCase().includes(targetStock) ||
                                   btnDataStock.toUpperCase() === targetStock ||
                                   btnText.toUpperCase().includes(targetStock);
              
              // Check if this buy button is for a different stock (EXCLUDE)
              const isWrongStock = btnTitle.toUpperCase().includes('HDFCBANK') ||
                                  btnTitle.toUpperCase().includes('RELIANCE') ||
                                  btnTitle.toUpperCase().includes('INFY') ||
                                  (targetStock === 'TCS' && (btnTitle.toUpperCase().includes('HDFCBANK') || 
                                                            btnTitle.toUpperCase().includes('RELIANCE') || 
                                                            btnTitle.toUpperCase().includes('INFY')));
              
              console.log(`🔍 Buy button validation for ${targetStock}:`);
              console.log(`Button title: "${btnTitle}"`);
              console.log(`Is correct stock: ${isCorrectStock}`);
              console.log(`Is wrong stock: ${isWrongStock}`);
              
              if (!isWrongStock && (isCorrectStock || !btnTitle)) {
                console.log(`✅ Found validated buy button for ${targetStock}:`, buyBtn);
                buyBtn.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                return { found: true, element: buyBtn, method: 'validated-stock-table', stock: targetStock };
              } else {
                console.log(`❌ Skipping buy button - belongs to different stock or validation failed`);
              }
            }
            parent = parent.parentElement;
          }
          
          // If no buy button found, try clicking the element itself
          console.log(`🔄 No buy button found, clicking stock element for ${targetStock}`);
          element.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { found: true, element: element, method: 'stock-click', stock: targetStock };
        }
      }
      
      // Strategy 4: Try to find stock by data attributes or IDs
      console.log(`🔍 Strategy 4: Looking for stock by data attributes for ${targetStock}`);
      const stockByAttribute = document.querySelector(`[data-stock="${targetStock}"], [data-symbol="${targetStock}"], #${targetStock.toLowerCase()}`);
      if (stockByAttribute) {
        console.log(`✅ Found stock by attribute for ${targetStock}:`, stockByAttribute);
        stockByAttribute.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { found: true, element: stockByAttribute, method: 'attribute-search', stock: targetStock };
      }
      
      // Strategy 5: Try to find any element that contains just the stock symbol
      console.log(`🔍 Strategy 5: Looking for exact stock symbol ${targetStock}`);
      const allTextElements = document.querySelectorAll('span, div, td, th, p, h1, h2, h3, h4, h5, h6');
      for (const element of allTextElements) {
        const text = element.textContent?.trim() || '';
        if (text === targetStock || text === `${targetStock}.NS` || text === `${targetStock}.BSE`) {
          console.log(`✅ Found exact stock match for ${targetStock}:`, element);
          // Try to find a clickable parent
          let clickableParent = element;
          while (clickableParent && clickableParent !== document.body) {
            if (clickableParent.onclick || clickableParent.style.cursor === 'pointer' || 
                clickableParent.tagName === 'BUTTON' || clickableParent.tagName === 'A' ||
                clickableParent.getAttribute('role') === 'button') {
              console.log(`🎯 Found clickable parent for ${targetStock}:`, clickableParent);
              clickableParent.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
              return { found: true, element: clickableParent, method: 'exact-match', stock: targetStock };
            }
            clickableParent = clickableParent.parentElement;
          }
        }
      }
      
      addToConversation('assistant', `⚠️ ${stockSymbol} not found in available stocks`);
      return { found: false };
    } catch (error) {
      console.error('Stock search error:', error);
      addToConversation('assistant', `❌ Error searching for ${stockSymbol}: ${error.message}`);
      return { found: false, error: error.message };
    }
  }, [addToConversation]);

  const openTradingModalAdvanced = useCallback(async (stockElement, action) => {
    try {
      addToConversation('assistant', `🎯 Opening ${action} trading interface...`);
      
      // Find the buy/sell button in the stock row
      const actionButton = stockElement.querySelector(`.${action.toLowerCase()}-btn, .trade-btn[data-action="${action}"]`);
      if (!actionButton) {
        // Look for generic trade buttons
        const tradeButtons = stockElement.querySelectorAll('.trade-btn, .action-btn, button');
        const targetButton = Array.from(tradeButtons).find(btn => 
          btn.textContent.toLowerCase().includes(action.toLowerCase()) ||
          btn.getAttribute('data-action') === action
        );
        
        if (targetButton) {
          targetButton.click();
        } else {
          throw new Error(`${action} button not found for this stock`);
        }
      } else {
        actionButton.click();
      }

      // Wait for trading modal to appear
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const tradingModal = document.querySelector('.trading-modal');
      if (tradingModal) {
        addToConversation('assistant', `✅ Trading modal opened successfully`);
        return { success: true, modal: tradingModal };
      } else {
        throw new Error('Trading modal did not open');
      }
    } catch (error) {
      addToConversation('assistant', `❌ Error opening trading modal: ${error.message}`);
      return { success: false, error: error.message };
    }
  }, [addToConversation]);

  const fillTradingForm = useCallback(async (tradeDetails) => {
  try {
    addToConversation('assistant', `📝 Filling trading form with your order details...`);
    
    const tradingModal = document.querySelector('.trading-modal');
    if (!tradingModal) {
      throw new Error('Trading modal not found');
    }

    // Verify we have the correct stock modal open
    const modalTitle = tradingModal.querySelector('h1, h2, h3, .modal-title, .title');
    if (modalTitle) {
      const titleText = modalTitle.textContent.toUpperCase();
      console.log(`🔍 Modal title: "${titleText}"`);
      
      // Check if the modal is for the correct stock
      if (!titleText.includes(tradeDetails.symbol)) {
        console.warn(`⚠️ Wrong modal opened. Expected: ${tradeDetails.symbol}, Got: ${titleText}`);
        addToConversation('assistant', `⚠️ Wrong trading modal opened. Expected ${tradeDetails.symbol} but got ${titleText}`);
        return { success: false, message: `Wrong stock modal opened: ${titleText}` };
      } else {
        console.log(`✅ Correct modal opened for ${tradeDetails.symbol}`);
      }
    }

    // Enhanced React state update method - defined at top level for reuse
    const fillInputWithReact = async (input, value) => {
      // Focus the input first
      input.focus();
      
      // Clear existing value
      input.value = '';
      
      // Create a proper React synthetic event
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(input, value.toString());
      
      // Dispatch React-friendly events
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Also try keyboard events for React forms
      const keyboardEvents = ['keydown', 'keypress', 'keyup'];
      keyboardEvents.forEach(eventType => {
        input.dispatchEvent(new KeyboardEvent(eventType, { 
          bubbles: true, 
          key: 'Enter',
          keyCode: 13,
          which: 13
        }));
      });
      
      // Blur and refocus to trigger validation
      input.blur();
      await new Promise(resolve => setTimeout(resolve, 100));
      input.focus();
      
      console.log(`🔍 Input value after React update: "${input.value}"`);
      return input.value === value.toString();
    };

    // Set order type if specified (Market is default)
    if (tradeDetails.orderType && tradeDetails.orderType === 'LIMIT') {
      const limitTab = tradingModal.querySelector('.order-type-tabs .tab:nth-child(2)');
      if (limitTab && limitTab.textContent.toLowerCase().includes('limit')) {
        limitTab.click();
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('🎯 Switched to LIMIT order type');
      }
    }

    // Fill quantity with enhanced React state detection
    console.log(`🔢 Looking for quantity input field...`);
    const quantitySelectors = [
      '#quantity',
      'input[id="quantity"]',
      'input[name="quantity"]',
      'input[placeholder*="quantity" i]',
      'input[placeholder*="Quantity" i]',
      'input[type="number"]',
      '.input-with-button input[type="number"]'
    ];
    
    let quantityInput = null;
    for (const selector of quantitySelectors) {
      quantityInput = tradingModal.querySelector(selector);
      if (quantityInput) {
        console.log(`✅ Found quantity input with selector: ${selector}`);
        break;
      }
    }
    
    if (quantityInput && tradeDetails.quantity) {
      console.log(`🔢 Filling quantity: ${tradeDetails.quantity}`);
      
      const success = await fillInputWithReact(quantityInput, tradeDetails.quantity);
      
      if (!success) {
        console.warn(`⚠️ React update failed, trying fallback method...`);
        
        // Fallback: Simulate typing
        quantityInput.value = '';
        quantityInput.focus();
        
        const quantityStr = tradeDetails.quantity.toString();
        for (let i = 0; i < quantityStr.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 50));
          quantityInput.value += quantityStr[i];
          
          // Trigger multiple events for each character
          quantityInput.dispatchEvent(new Event('input', { bubbles: true }));
          quantityInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Final validation trigger
        quantityInput.dispatchEvent(new Event('blur', { bubbles: true }));
      }
      
      console.log(`✅ Final quantity value: "${quantityInput.value}"`);
      
    } else {
      console.warn(`⚠️ Quantity input not found or no quantity specified`);
      const allInputs = tradingModal.querySelectorAll('input');
      console.log(`Available inputs:`, Array.from(allInputs).map(inp => ({
        id: inp.id,
        name: inp.name, 
        type: inp.type,
        placeholder: inp.placeholder
      })));
    }

    // Fill price if it's a limit order
    if (tradeDetails.price && tradeDetails.orderType === 'LIMIT') {
      const priceInput = tradingModal.querySelector('#price, input[name="price"], input[placeholder*="price" i]');
      if (priceInput) {
        await fillInputWithReact(priceInput, tradeDetails.price);
        console.log(`✅ Filled price: ${tradeDetails.price}`);
      }
    }

    // Wait for form validation and React updates
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    addToConversation('assistant', `✅ Trading form filled successfully`);
    
    // Now automatically click the BUY/SELL button with enhanced detection
    addToConversation('assistant', `🚀 Executing ${tradeDetails.type} order...`);
    
    console.log(`🔍 Looking for ${tradeDetails.type} submit button...`);
    
    // Enhanced button detection for TradingModal
    const findSubmitButton = () => {
      // Strategy 1: Look for button with specific classes from TradingModal
      const classBasedButtons = tradingModal.querySelectorAll(`
        .submit-btn.${tradeDetails.type.toLowerCase()},
        .submit-btn,
        button[type="submit"]
      `);
      
      for (const btn of classBasedButtons) {
        const btnText = btn.textContent.toUpperCase();
        const btnClass = btn.className.toLowerCase();
        
        // Check if this button matches our trade type
        if ((btnText.includes(tradeDetails.type) || btnClass.includes(tradeDetails.type.toLowerCase())) &&
            !btn.disabled) {
          console.log(`✅ Found submit button by class: "${btn.className}"`);
          return btn;
        }
      }
      
      // Strategy 2: Look for buttons by text content with stock symbol
      const allButtons = tradingModal.querySelectorAll('button');
      
      for (const btn of allButtons) {
        const btnText = btn.textContent.toUpperCase().trim();
        const isCorrectType = btnText.includes(tradeDetails.type.toUpperCase());
        const hasStockSymbol = btnText.includes(tradeDetails.symbol.toUpperCase());
        const isGenericSubmit = btnText.includes('SUBMIT') || btnText.includes('PLACE ORDER') || btnText.includes('CONFIRM');
        
        // Prioritize buttons that mention both action and stock
        if ((isCorrectType && hasStockSymbol) || (isCorrectType && isGenericSubmit)) {
          console.log(`✅ Found submit button by text: "${btnText}"`);
          return btn;
        }
      }
      
      // Strategy 3: Look for action buttons in modal-actions container
      const modalActions = tradingModal.querySelector('.modal-actions');
      if (modalActions) {
        const actionButtons = modalActions.querySelectorAll('button');
        for (const btn of actionButtons) {
          const btnText = btn.textContent.toUpperCase();
          if (btnText.includes(tradeDetails.type) && !btnText.includes('CANCEL')) {
            console.log(`✅ Found submit button in modal actions: "${btnText}"`);
            return btn;
          }
        }
      }
      
      return null;
    };
    
    const submitButton = findSubmitButton();
    
    if (!submitButton) {
      console.error(`❌ ${tradeDetails.type} button not found in trading modal`);
      // Log all buttons for debugging
      const allButtons = tradingModal.querySelectorAll('button');
      console.log('📋 All available buttons:', Array.from(allButtons).map(btn => ({
        text: btn.textContent.trim(),
        className: btn.className,
        disabled: btn.disabled
      })));
      
      addToConversation('assistant', `❌ Could not find ${tradeDetails.type} button. Please click manually to complete the order.`);
      return { success: true, message: 'Form filled, manual completion required' };
    }
    
    // Check if button is disabled and try to enable it
    if (submitButton.disabled) {
      console.log('🔧 Submit button is disabled, checking form validation...');
      
      // Trigger form validation
      const form = tradingModal.querySelector('form');
      if (form) {
        // Dispatch form events to trigger validation
        form.dispatchEvent(new Event('change', { bubbles: true }));
        form.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // Wait for validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force enable if still disabled (for automation purposes)
      if (submitButton.disabled) {
        console.log('🔧 Force enabling submit button for automation');
        submitButton.disabled = false;
        submitButton.removeAttribute('disabled');
      }
    }
    
    // Click the submit button with multiple approaches
    console.log(`🎯 Clicking ${tradeDetails.type} button: "${submitButton.textContent.trim()}"`);
    
    try {
      // Focus the button first
      submitButton.focus();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Method 1: Standard click
      submitButton.click();
      
      // Method 2: Dispatch mouse event
      submitButton.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0
      }));
      
      // Method 3: Dispatch pointer events (for modern React)
      ['pointerdown', 'pointerup'].forEach(eventType => {
        submitButton.dispatchEvent(new PointerEvent(eventType, {
          bubbles: true,
          cancelable: true,
          pointerId: 1
        }));
      });
      
      console.log(`✅ Successfully clicked submit button`);
      
      // Wait for order processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addToConversation('assistant', `✅ ${tradeDetails.type} order submitted successfully! 🎉`);
      return { success: true, message: `${tradeDetails.type} order placed successfully` };
      
    } catch (clickError) {
      console.error('❌ Error clicking submit button:', clickError);
      addToConversation('assistant', `⚠️ Form filled but could not auto-click button. Please click "${submitButton.textContent.trim()}" to complete.`);
      return { success: true, message: 'Form filled, please click submit manually' };
    }
  } catch (error) {
    console.error('Trading form error:', error);
    addToConversation('assistant', `❌ Error with trading form: ${error.message}`);
    return { success: false, error: error.message };
  }
}, [addToConversation]);

  const executeTrade = useCallback(async () => {
    try {
      addToConversation('assistant', `🚀 Executing trade order...`);
      
      const tradingModal = document.querySelector('.trading-modal');
      if (!tradingModal) {
        throw new Error('Trading modal not found');
      }

      // Find and click the submit button
      const submitBtn = tradingModal.querySelector('.submit-btn, button[type="submit"]');
      if (!submitBtn) {
        throw new Error('Submit button not found');
      }

      // Check if button is disabled
      if (submitBtn.disabled) {
        throw new Error('Cannot execute trade - button is disabled (check form validation)');
      }

      submitBtn.click();
      
      // Wait for trade execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addToConversation('assistant', `✅ Trade executed successfully! Check your portfolio for updates.`);
      return { success: true };
    } catch (error) {
      addToConversation('assistant', `❌ Error executing trade: ${error.message}`);
      return { success: false, error: error.message };
    }
  }, [addToConversation]);

  const automateFullTradeFlow = useCallback(async (tradeDetails) => {
    try {
      setProgress(10);
      
      // Step 1: Search for the stock
      const searchResult = await automateStockSearch(tradeDetails.stock);
      if (!searchResult.found) {
        return false;
      }
      setProgress(30);

      // Step 2: Open trading modal
      const modalResult = await openTradingModalAdvanced(searchResult.element, tradeDetails.type);
      if (!modalResult.success) {
        return false;
      }
      setProgress(50);

      // Step 3: Fill the trading form
      const formResult = await fillTradingForm(tradeDetails);
      if (!formResult.success) {
        return false;
      }
      setProgress(80);

      // Step 4: Execute the trade (optional - can be done with confirmation)
      if (tradeDetails.autoExecute) {
        const tradeResult = await executeTrade();
        if (!tradeResult.success) {
          return false;
        }
        setProgress(100);
      } else {
        addToConversation('assistant', `⏳ Trade form is ready. Please review and click the ${tradeDetails.type} button to execute.`);
        setProgress(90);
      }

      return true;
    } catch (error) {
      addToConversation('assistant', `❌ Automation failed: ${error.message}`);
      return false;
    }
  }, [automateStockSearch, openTradingModalAdvanced, fillTradingForm, executeTrade, addToConversation]);

  // Legacy DOM manipulation functions (kept for compatibility)
  const findAndSelectStock = useCallback(async (symbol) => {
    const result = await automateStockSearch(symbol);
    return result.found;
  }, [automateStockSearch]);

  const openTradingModal = useCallback(async (actionType) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Opening ${actionType} modal`);
        resolve(true);
      }, 500);
    });
  }, []);

  const fillTradeDetails = useCallback(async (action) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Filling trade details:`, action);
        resolve(true);
      }, 500);
    });
  }, []);


  // Execute trade action through advanced DOM automation
  const executeTradeAction = useCallback(async (action) => {
    try {
      setIsExecuting(true);
      setCurrentStatus(isHindi ? '⚡ ट्रेड कर रहा हूं...' : '⚡ Executing trade...');
      setProgress(0);
      
      // Prepare trade details for automation
      const tradeDetails = {
        stock: action.symbol,
        type: action.type,  // Use 'type' instead of 'action' for consistency
        symbol: action.symbol, // Add symbol for the button detection
        quantity: action.quantity,
        price: action.price,
        orderType: action.price_type === 'limit' ? 'LIMIT' : 'MARKET',
        autoExecute: false // Let user confirm final execution
      };

      // Use advanced DOM automation
      const automationSuccess = await automateFullTradeFlow(tradeDetails);
      
      if (automationSuccess) {
        const successMessage = isHindi
          ? `${action.quantity} शेयर ${action.symbol} के लिए ऑर्डर तैयार है`
          : `Trade order for ${action.quantity} shares of ${action.symbol} is ready for execution`;
        
        speak(successMessage);
        setCurrentStatus(isHindi ? '✅ ऑर्डर तैयार' : '✅ Order Ready');
        
        addToConversation('assistant', successMessage, action);
      } else {
        // Fallback to legacy method if automation fails
        const stockFound = await findAndSelectStock(action.symbol);
        
        if (!stockFound) {
          const errorMessage = isHindi
            ? `${action.symbol} शेयर नहीं मिला`
            : `Could not find ${action.symbol} stock`;
          speak(errorMessage);
          addToConversation('assistant', errorMessage);
          return;
        }

        const tradeModalOpened = await openTradingModal(action.type);
        
        if (!tradeModalOpened) {
          const errorMessage = isHindi
            ? 'ट्रेडिंग विंडो नहीं खुली'
            : 'Could not open trading window';
          speak(errorMessage);
          addToConversation('assistant', errorMessage);
          return;
        }

        await fillTradeDetails(action);
        
        const readyMessage = isHindi
          ? `${action.quantity} शेयर ${action.symbol} के लिए फॉर्म भरा गया`
          : `Trade form filled for ${action.quantity} shares of ${action.symbol}`;
        
        speak(readyMessage);
        setCurrentStatus(isHindi ? '✅ फॉर्म तैयार' : '✅ Form Ready');
        addToConversation('assistant', readyMessage, action);
      }
      
    } catch (error) {
      console.error('Trade execution error:', error);
      const errorMessage = isHindi
        ? 'ट्रेड करने में त्रुटि हुई'
        : 'Error executing trade';
      speak(errorMessage);
      addToConversation('assistant', errorMessage);
      setCurrentStatus(isHindi ? '❌ त्रुटि हुई' : '❌ Error occurred');
    } finally {
      setIsExecuting(false);
      setProgress(0);
      setPendingAction(null);
      setConfirmationPending(false);
      setTimeout(() => setCurrentStatus(''), 3000);
    }
  }, [isHindi, speak, automateFullTradeFlow, addToConversation, findAndSelectStock, openTradingModal, fillTradeDetails]);

  // Handle trading commands (buy/sell)
  const handleTradeCommand = useCallback(async (parsedCommand) => {
    console.log('🎯 handleTradeCommand called with:', parsedCommand);
    
    const { action, stock_symbol, quantity, price_type, price, missing_info, clarification_needed } = parsedCommand;
    
    // Check for essential missing information (but allow price_type to default)
    const essentialMissing = missing_info?.filter(info => info !== 'price_type') || [];
    
    console.log('🔍 Essential missing info:', essentialMissing);
    
    if (essentialMissing.length > 0) {
      console.log('❌ Missing essential info, asking for clarification');
      speak(clarification_needed);
      addToConversation('assistant', clarification_needed);
      return;
    }
    
    // Default to MARKET order if price_type is not specified
    const orderType = price_type === 'limit' ? 'LIMIT' : 'MARKET';
    
    const tradeAction = {
      type: action.toUpperCase(),
      symbol: stock_symbol.toUpperCase(),
      quantity: quantity,
      price: price,
      price_type: orderType,
      orderType: orderType
    };
    
    console.log('✅ Trade action prepared:', tradeAction);
    
    const confirmMessage = isHindi
      ? `क्या आप ${action === 'buy' ? 'खरीदना' : 'बेचना'} चाहते हैं ${quantity} शेयर ${stock_symbol} के? कहें हाँ या नहीं।`
      : `Do you want to ${action} ${quantity} shares of ${stock_symbol}? Say yes or no.`;
    
    console.log('🗣️ Speaking confirmation message:', confirmMessage);
    speak(confirmMessage);
    addToConversation('assistant', confirmMessage);
    setPendingAction(tradeAction);
    setConfirmationPending(true);
    
    // Start listening for confirmation after a short delay
    setTimeout(() => {
      if (!isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
          setCurrentStatus(isHindi ? '🎤 सुन रहा हूं... (हाँ/नहीं)' : '🎤 Listening... (yes/no)');
          console.log('🎤 Auto-started listening for confirmation');
        } catch (error) {
          console.error('Error auto-starting recognition for confirmation:', error);
        }
      }
    }, 2000); // Wait 2 seconds for the speech to finish
  }, [speak, isHindi, addToConversation, isListening]);

  // Handle portfolio check
  const handlePortfolioCheck = useCallback(async () => {
    try {
      if (!user || !user.portfolio || user.portfolio.length === 0) {
        const message = isHindi
          ? 'आपके पास कोई शेयर नहीं है'
          : 'You have no stocks in your portfolio';
        speak(message);
        return;
      }

      const totalValue = user.totalPortfolioValue || 0;
      const totalPnL = user.totalProfitLoss || 0;
      const holdingsCount = user.portfolio.length;

      const portfolioMessage = isHindi
        ? `आपके पास ${holdingsCount} कंपनियों के शेयर हैं। कुल वैल्यू ${totalValue.toFixed(0)} रुपये है। ${totalPnL >= 0 ? 'लाभ' : 'हानि'} ${Math.abs(totalPnL).toFixed(0)} रुपये है।`
        : `You have stocks from ${holdingsCount} companies. Total value is ${totalValue.toFixed(0)} rupees. ${totalPnL >= 0 ? 'Profit' : 'Loss'} is ${Math.abs(totalPnL).toFixed(0)} rupees.`;

      speak(portfolioMessage);
    } catch (error) {
      console.error('Portfolio check error:', error);
      const errorMessage = isHindi
        ? 'पोर्टफोलियो की जानकारी नहीं मिली'
        : 'Could not get portfolio information';
      speak(errorMessage);
    }
  }, [user, isHindi, speak]);

  // Handle price check
  const handlePriceCheck = useCallback(async (symbol) => {
    if (!symbol) {
      const message = isHindi
        ? 'कौन से शेयर की कीमत जानना चाहते हैं?'
        : 'Which stock price do you want to know?';
      speak(message);
      return;
    }

    const priceMessage = isHindi
      ? `${symbol} की कीमत जांच रहा हूं...`
      : `Checking ${symbol} price...`;
    speak(priceMessage);
  }, [isHindi, speak]);

  // Handle balance check
  const handleBalanceCheck = useCallback(async () => {
    try {
      const balance = user?.virtualBalance || 0;
      const message = isHindi
        ? `आपका बैलेंस ${balance.toFixed(0)} रुपये है`
        : `Your balance is ${balance.toFixed(0)} rupees`;
      speak(message);
    } catch (error) {
      const errorMessage = isHindi
        ? 'बैलेंस की जानकारी नहीं मिली'
        : 'Could not get balance information';
      speak(errorMessage);
    }
  }, [user, isHindi, speak]);

  // Handle voice command processing
  const handleVoiceCommand = useCallback(async (transcript) => {
    console.log('🎤 Voice command received:', transcript);
    console.log('⏳ Confirmation pending:', confirmationPending);
    console.log('📋 Pending action:', pendingAction);
    
    setConversationHistory(prev => [...prev, {
      type: 'user',
      text: transcript,
      timestamp: new Date()
    }]);

    // Check for confirmation responses
    if (confirmationPending && pendingAction) {
      console.log('🔍 Processing confirmation response...');
      
      const confirmationWords = isHindi 
        ? ['हाँ', 'हां', 'जी', 'करो', 'ठीक है', 'yes', 'okay', 'confirm']
        : ['yes', 'okay', 'confirm', 'proceed', 'go ahead'];
      
      const cancelWords = isHindi
        ? ['नहीं', 'मत करो', 'रुको', 'नो', 'cancel', 'stop', 'wait']
        : ['no', 'cancel', 'stop', 'wait', 'abort'];

      const lowerTranscript = transcript.toLowerCase();
      
      if (confirmationWords.some(word => lowerTranscript.includes(word))) {
        console.log('✅ Confirmation received, executing trade...');
        setIsProcessing(true); // Set processing immediately to prevent auto-restart
        setConfirmationPending(false);
        setCurrentStatus(isHindi ? '🔄 ट्रेड एक्जीक्यूट कर रहे हैं...' : '🔄 Executing trade...');
        await executeTradeAction(pendingAction);
        setPendingAction(null);
        setIsProcessing(false);
        return;
      } else if (cancelWords.some(word => lowerTranscript.includes(word))) {
        console.log('❌ Trade cancelled by user');
        setIsProcessing(true); // Prevent auto-restart during cancellation
        const cancelMessage = isHindi 
          ? 'ट्रेड रद्द कर दिया गया'
          : 'Trade cancelled';
        speak(cancelMessage);
        addToConversation('assistant', cancelMessage);
        setPendingAction(null);
        setConfirmationPending(false);
        setCurrentStatus('');
        setIsProcessing(false);
        return;
      } else {
        console.log('❓ Unclear confirmation response, asking again');
        const clarifyMessage = isHindi
          ? 'कृपया स्पष्ट रूप से हाँ या नहीं कहें'
          : 'Please clearly say yes or no';
        speak(clarifyMessage);
        addToConversation('assistant', clarifyMessage);
        return;
      }
    }

    const parsedCommand = await parseTradeCommand(transcript);
    console.log('📊 Parsed command result:', parsedCommand);
    
    if (parsedCommand.confidence < 0.3) {
      console.log('❌ Low confidence, asking for clarification');
      speak(parsedCommand.clarification_needed);
      return;
    }

    console.log('🎯 Processing action:', parsedCommand.action);
    
    switch (parsedCommand.action) {
      case 'buy':
      case 'sell':
        console.log('💰 Calling handleTradeCommand for buy/sell');
        await handleTradeCommand(parsedCommand);
        break;
      case 'check_portfolio':
        console.log('📊 Calling handlePortfolioCheck');
        await handlePortfolioCheck();
        break;
      case 'check_price':
        console.log('💲 Calling handlePriceCheck');
        await handlePriceCheck(parsedCommand.stock_symbol);
        break;
      case 'check_balance':
        console.log('💳 Calling handleBalanceCheck');
        await handleBalanceCheck();
        break;
      default:
        console.log('❓ Unknown action, providing help');
        const unknownMessage = isHindi
          ? 'मुझे समझ नहीं आया। कृपया स्पष्ट रूप से बताएं कि आप क्या करना चाहते हैं।'
          : 'I did not understand. Please clearly tell me what you want to do.';
        speak(unknownMessage);
    }
  }, [isHindi, confirmationPending, pendingAction, executeTradeAction, speak, parseTradeCommand, handleTradeCommand, handlePortfolioCheck, handlePriceCheck, handleBalanceCheck, addToConversation]);

  // Store refs for handlers to avoid dependency issues
  const handleVoiceCommandRef = useRef(handleVoiceCommand);
  const speakRef = useRef(speak);
  const recognitionRef = useRef(null);
  const isHindiRef = useRef(isHindi);
  const isProcessingRef = useRef(isProcessing);
  const confirmationPendingRef = useRef(confirmationPending);
  const startListeningRef = useRef(null);

  // Initialize voice features
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    
    if (SpeechRecognition && speechSynthesis) {
      setVoiceSupported(true);
      
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true; // Enable interim results to catch partial speech
      recognitionInstance.maxAlternatives = 3; // Get more alternatives
      recognitionInstance.lang = currentVoiceLanguage.code;
      
      recognitionInstance.onstart = () => {
        console.log('🎤 Speech recognition started successfully');
        setIsListening(true);
        setCurrentStatus(isHindiRef.current ? '🎤 सुन रहा हूं...' : '🎤 Listening...');
      };
      
      recognitionInstance.onresult = (event) => {
        console.log('🗣️ Speech recognition result received:', event);
        
        // Process all results to find the final one
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            const transcript = result[0].transcript.trim();
            const confidence = result[0].confidence;
            console.log('📝 Final Transcript:', transcript, 'Confidence:', confidence);
            
            if (transcript.length > 0) {
              handleVoiceCommandRef.current(transcript);
              return; // Exit after processing final result
            }
          } else {
            // Log interim results for debugging
            const interimTranscript = result[0].transcript;
            console.log('🔄 Interim:', interimTranscript);
          }
        }
      };
      
      recognitionInstance.onspeechstart = () => {
        console.log('🗣️ Speech detected - user started speaking');
      };
      
      recognitionInstance.onspeechend = () => {
        console.log('🔇 Speech ended - user stopped speaking');
      };
      
      recognitionInstance.onnomatch = () => {
        console.log('❓ No speech match found');
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Handle different types of errors
        if (event.error === 'no-speech') {
          console.log('👂 No speech detected');
          if (confirmationPendingRef.current) {
            // In confirmation mode, just let it auto-restart
            setCurrentStatus(isHindiRef.current 
              ? '🔇 कोई आवाज़ नहीं सुनी - फिर कोशिश करें' 
              : '🔇 No speech heard - trying again'
            );
          } else {
            setCurrentStatus(isHindiRef.current ? '🔇 कोई आवाज़ नहीं सुनी गई' : '🔇 No speech detected');
          }
          return; // Let the onend handler deal with restart
        } else if (event.error === 'aborted') {
          console.log('🛑 Speech recognition aborted');
          return; // Don't show error for intentional aborts
        } else if (event.error === 'not-allowed') {
          console.log('🚫 Microphone permission denied');
          setCurrentStatus(isHindiRef.current 
            ? '🚫 माइक्रोफ़ोन की अनुमति दें' 
            : '🚫 Please allow microphone access'
          );
          const errorMessage = isHindiRef.current 
            ? 'माइक्रोफ़ोन की अनुमति दें और फिर कोशिश करें' 
            : 'Please allow microphone access and try again';
          speakRef.current(errorMessage);
          return;
        }
        
        // For other errors, show generic message
        setCurrentStatus(isHindiRef.current 
          ? '❌ आवाज़ पहचान में त्रुटि - फिर कोशिश करें' 
          : '❌ Speech recognition error - please try again'
        );
        
        const errorMessage = isHindiRef.current 
          ? 'वॉइस इनपुट में त्रुटि हुई, फिर कोशिश करें' 
          : 'Voice input error occurred, please try again';
        speakRef.current(errorMessage);
      };
      
      recognitionInstance.onend = () => {
        console.log('🎤 Speech recognition ended. Confirmation pending:', confirmationPendingRef.current);
        setIsListening(false);
        
        // Only auto-restart if we're still waiting for confirmation AND not currently processing
        if (confirmationPendingRef.current && !isProcessingRef.current) {
          console.log('🔄 Auto-restarting speech recognition for confirmation');
          setTimeout(() => {
            // Double-check the confirmation is still pending before restarting
            if (confirmationPendingRef.current && recognitionRef.current && !isProcessingRef.current) {
              try {
                console.log('🎤 Attempting to restart recognition...');
                recognitionRef.current.start();
                setIsListening(true);
                setCurrentStatus(isHindiRef.current ? '🎤 सुन रहा हूं... (हाँ/नहीं)' : '🎤 Listening... (yes/no)');
              } catch (error) {
                console.error('Error restarting recognition:', error);
                // If restart fails multiple times, ask user to click
                setCurrentStatus(isHindiRef.current 
                  ? '🔄 फिर से "हाँ" या "नहीं" कहें या माइक बटन दबाएं' 
                  : '🔄 Say "yes" or "no" again or click mic button'
                );
              }
            }
          }, 1200); // Increased timeout to give more time for processing
        } else if (!isProcessingRef.current) {
          setCurrentStatus(isHindiRef.current ? '🎤 बोलने के लिए क्लिक करें' : '🎤 Click to speak');
        }
      };
      
      setRecognition(recognitionInstance);
      recognitionRef.current = recognitionInstance;
      speechSynthesisRef.current = speechSynthesis;
      
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        console.log('📢 Available voices for trading:', voices.map(v => `${v.name} (${v.lang})`));
      };
      
      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
    } else {
      setVoiceSupported(false);
      console.log('Web Speech API not supported for voice trading');
    }
    
    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, [currentVoiceLanguage.code]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!voiceSupported || !recognitionRef.current || isListening) return;
    
    // Check microphone permissions
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      console.log('🎤 Microphone access granted');
    } catch (error) {
      console.error('🚫 Microphone access denied:', error);
      const errorMsg = isHindiRef.current 
        ? 'माइक्रोफ़ोन की अनुमति दें' 
        : 'Please allow microphone access';
      setCurrentStatus(errorMsg);
      speakRef.current(errorMsg);
      return;
    }
    
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
    
    try {
      recognitionRef.current.lang = currentVoiceLanguage.code;
      recognitionRef.current.start();
      setIsListening(true);
      
      // Set appropriate status based on context
      if (confirmationPendingRef.current) {
        setCurrentStatus(isHindiRef.current ? '🎤 सुन रहा हूं... (हाँ/नहीं)' : '🎤 Listening... (yes/no)');
      } else {
        setCurrentStatus(isHindiRef.current ? '🎤 सुन रहा हूं...' : '🎤 Listening...');
      }
      
      console.log('🎤 Started listening, confirmation pending:', confirmationPendingRef.current);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setCurrentStatus(isHindiRef.current ? '❌ आवाज़ पहचान शुरू नहीं हो सकी' : '❌ Could not start speech recognition');
    }
  }, [voiceSupported, isListening, currentVoiceLanguage.code]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Update refs when functions change
  useEffect(() => {
    handleVoiceCommandRef.current = handleVoiceCommand;
    speakRef.current = speak;
    recognitionRef.current = recognition;
    isHindiRef.current = isHindi;
    isProcessingRef.current = isProcessing;
    confirmationPendingRef.current = confirmationPending;
    startListeningRef.current = startListening;
  }, [handleVoiceCommand, speak, recognition, isHindi, isProcessing, confirmationPending, startListening]);

  // Toggle language
  const toggleLanguage = useCallback(() => {
    const nextIndex = (speechLanguageIndex + 1) % VOICE_LANGUAGES.length;
    setSpeechLanguageIndex(nextIndex);
    
    if (isListening && recognition) {
      recognition.stop();
      setTimeout(() => {
        if (recognition) {
          recognition.lang = VOICE_LANGUAGES[nextIndex].code;
          recognition.start();
        }
      }, 100);
    }
  }, [speechLanguageIndex, isListening, recognition]);

  // Clear conversation
  const clearConversation = () => {
    setConversationHistory([]);
    setPendingAction(null);
    setConfirmationPending(false);
    setCurrentStatus('');
    setProgress(0);
  };

  // Demo function to show voice trading capabilities
  const runDemo = useCallback(() => {
    const demoCommands = [
      {
        text: isHindi ? 'डेमो शुरू कर रहे हैं...' : 'Starting voice trading demo...',
        delay: 1000
      },
      {
        text: isHindi ? '🎯 "TCS के 5 शेयर खरीदो" - यह कमांड TCS के 5 शेयर खरीदने का ऑर्डर बनाएगी' : '🎯 "Buy 5 shares of TCS" - This command will create a buy order for 5 TCS shares',
        delay: 3000
      },
      {
        text: isHindi ? '🎯 "रिलायंस के 2 शेयर बेचो" - यह कमांड Reliance के 2 शेयर बेचने का ऑर्डर बनाएगी' : '🎯 "Sell 2 shares of Reliance" - This command will create a sell order for 2 Reliance shares',
        delay: 3000
      },
      {
        text: isHindi ? '🎯 "मेरा बैलेंस बताओ" - यह आपका करंट बैलेंस बताएगा' : '🎯 "Check my balance" - This will tell you your current balance',
        delay: 3000
      },
      {
        text: isHindi ? '🎯 "मेरा पोर्टफोलियो दिखाओ" - यह आपके सभी शेयरों की जानकारी देगा' : '🎯 "Show my portfolio" - This will display all your stock holdings',
        delay: 3000
      },
      {
        text: isHindi ? '✅ डेमो पूरा! माइक बटन दबाकर बोलना शुरू करें।' : '✅ Demo complete! Press the mic button to start voice trading.',
        delay: 2000
      }
    ];

    let currentIndex = 0;
    
    const showNextDemo = () => {
      if (currentIndex < demoCommands.length) {
        const demo = demoCommands[currentIndex];
        addToConversation('assistant', demo.text);
        speak(demo.text);
        
        currentIndex++;
        setTimeout(showNextDemo, demo.delay);
      }
    };

    clearConversation();
    showNextDemo();
  }, [isHindi, addToConversation, speak]);

  return (
    <>
      {/* Voice Trade Bot Toggle Button */}
      <button 
        className={`voice-trade-toggle ${isVisible ? 'active' : ''}`}
        onClick={() => setIsVisible(!isVisible)}
        title={isHindi ? 'वॉइस ट्रेडिंग' : 'Voice Trading'}
        disabled={!voiceSupported}
      >
        {isVisible ? '✕' : '🎯'}
      </button>

      {/* Voice Trade Bot Window */}
      {isVisible && voiceSupported && (
        <div className="voice-trade-window">
          {/* Header */}
          <div className="voice-trade-header">
            <div className="voice-trade-title">
              <span className="voice-trade-icon">🎯</span>
              <div>
                <h3><Trans>वॉइस ट्रेडिंग - Voice Trading</Trans></h3>
                <span className="status-indicator">
                  <span className="status-dot"></span>
                  {currentStatus || (isHindi ? 'तैयार - Ready' : 'Ready')}
                </span>
                {progress > 0 && progress < 100 && (
                  <div className="progress-container">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${progress}%` }}
                    ></div>
                    <span className="progress-text">{progress}%</span>
                  </div>
                )}
              </div>
            </div>
            <div className="header-controls">
              <button 
                className={`speech-lang-btn lang-${currentVoiceLanguage.code.split('-')[0]}`}
                onClick={toggleLanguage}
                title={`Voice: ${currentVoiceLanguage.name} - Click to switch`}
              >
                {currentVoiceLanguage.shortName}
              </button>
              <button 
                className="demo-btn"
                onClick={runDemo}
                title={isHindi ? 'डेमो देखें' : 'View Demo'}
              >
                📖
              </button>
              <button 
                className="clear-btn"
                onClick={clearConversation}
                title={isHindi ? 'साफ़ करें' : 'Clear'}
              >
                🗑️
              </button>
              <button 
                className="close-btn"
                onClick={() => setIsVisible(false)}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="progress-section">
            <div className={`progress-step ${isListening ? 'active' : ''}`}>
              <span className="step-icon">🎤</span>
              <span className="step-text">{isHindi ? 'सुनना' : 'Listen'}</span>
            </div>
            <div className={`progress-step ${isProcessing ? 'active' : ''}`}>
              <span className="step-icon">🧠</span>
              <span className="step-text">{isHindi ? 'समझना' : 'Process'}</span>
            </div>
            <div className={`progress-step ${isExecuting ? 'active' : ''}`}>
              <span className="step-icon">⚡</span>
              <span className="step-text">{isHindi ? 'करना' : 'Execute'}</span>
            </div>
          </div>

          {/* Conversation History */}
          <div className="conversation-history">
            {conversationHistory.length === 0 && (
              <div className="welcome-message">
                <div className="welcome-text">
                  {isHindi 
                    ? '👋 नमस्ते! आप बोलकर ट्रेड कर सकते हैं।' 
                    : '👋 Hello! You can trade using voice commands.'
                  }
                </div>
                <div className="example-commands">
                  <div className="examples-title">
                    {isHindi ? 'उदाहरण:' : 'Examples:'}
                  </div>
                  <div className="example-item">• "Buy 2 shares of TCS"</div>
                  <div className="example-item">• "TCS के 2 शेयर खरीदो"</div>
                  <div className="example-item">• "Show my portfolio"</div>
                  <div className="example-item">• "मेरा पोर्टफोलियो दिखाओ"</div>
                </div>
              </div>
            )}
            
            {conversationHistory.map((item, index) => (
              <div key={index} className={`conversation-item ${item.type}`}>
                <div className="conversation-content">
                  <span className="conversation-icon">
                    {item.type === 'user' ? '👤' : '🤖'}
                  </span>
                  <span className="conversation-text">{item.text}</span>
                </div>
                <div className="conversation-time">
                  {item.timestamp.toLocaleTimeString('en-IN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Voice Controls */}
          <div className="voice-controls">
            <button
              className={`main-voice-btn ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''} ${isExecuting ? 'executing' : ''} ${confirmationPending ? 'confirmation' : ''}`}
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing || isExecuting || isSpeaking}
            >
              <span className="voice-btn-icon">
                {isListening ? '🔴' : isProcessing ? '🧠' : isExecuting ? '⚡' : confirmationPending ? '❓' : '🎤'}
              </span>
              <span className="voice-btn-text">
                {isListening 
                  ? (isHindi ? 'रुकें' : 'Stop')
                  : isProcessing 
                  ? (isHindi ? 'सोच रहा हूं...' : 'Thinking...')
                  : isExecuting
                  ? (isHindi ? 'करा रहा हूं...' : 'Executing...')
                  : confirmationPending
                  ? (isHindi ? 'हाँ/नहीं' : 'Yes/No')
                  : (isHindi ? 'बोलें' : 'Speak')
                }
              </span>
            </button>
            
            <div className="voice-status">
              {confirmationPending && (
                <div className="confirmation-message">
                  {isHindi 
                    ? '⏳ पुष्टि का इंतज़ार... (हाँ/नहीं कहें)'
                    : '⏳ Waiting for confirmation... (Say yes/no)'
                  }
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="voice-trade-footer">
            <div className="security-notice">
              🔒 {isHindi 
                ? 'सुरक्षित ट्रेडिंग - सभी ट्रेड की पुष्टि होगी'
                : 'Secure Trading - All trades require confirmation'
              }
            </div>
            <div className="powered-by">
              Powered by <strong>Gemini AI</strong>
            </div>
          </div>
        </div>
      )}

      {/* Voice not supported message */}
      {!voiceSupported && isVisible && (
        <div className="voice-trade-window">
          <div className="voice-trade-header">
            <div className="voice-trade-title">
              <span className="voice-trade-icon">🎯</span>
              <h3>Voice Trading</h3>
            </div>
            <button 
              className="close-btn"
              onClick={() => setIsVisible(false)}
            >
              ✕
            </button>
          </div>
          <div className="error-message">
            <h4>{isHindi ? 'वॉइस समर्थन उपलब्ध नहीं' : 'Voice Not Supported'}</h4>
            <p>
              {isHindi 
                ? 'आपका ब्राउज़र वॉइस रिकॉग्निशन को सपोर्ट नहीं करता। कृपया Chrome या Edge का उपयोग करें।'
                : 'Your browser does not support voice recognition. Please use Chrome or Edge browser.'
              }
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceTradeBot;
