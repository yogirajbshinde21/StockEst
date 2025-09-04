import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// SocketContext for managing real-time socket connections
const SocketContext = createContext();

// Initial state
const initialState = {
  socket: null,
  isConnected: false,
  stockData: {
    stocks: [],
    marketStatus: 'LOADING', // Changed from 'CLOSED' to 'LOADING'
    isMarketOpen: null, // Changed from false to null
    lastUpdated: null
  },
  portfolioData: null,
  connectionError: null
};

// Socket reducer
const socketReducer = (state, action) => {
  switch (action.type) {
    case 'SOCKET_CONNECT':
      return {
        ...state,
        socket: action.payload,
        isConnected: true,
        connectionError: null
      };
    
    case 'SOCKET_DISCONNECT':
      return {
        ...state,
        socket: null,
        isConnected: false
      };
    
    case 'SOCKET_ERROR':
      return {
        ...state,
        connectionError: action.payload,
        isConnected: false
      };
    
    case 'UPDATE_STOCK_DATA':
      return {
        ...state,
        stockData: action.payload
      };
    
    case 'UPDATE_PORTFOLIO_DATA':
      return {
        ...state,
        portfolioData: action.payload
      };
    
    case 'CLEAR_CONNECTION_ERROR':
      return {
        ...state,
        connectionError: null
      };
    
    default:
      return state;
  }
};

// SocketProvider component
export const SocketProvider = ({ children }) => {
  const [state, dispatch] = useReducer(socketReducer, initialState);
  const { token, isAuthenticated, user } = useAuth();
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const subscriptionCheckRef = useRef(null);
  const isSubscribedToStocks = useRef(false);
  const lastStockDataUpdate = useRef(Date.now());

  // Check if stock data is fresh (received within last 60 seconds)
  useEffect(() => {
    const dataFreshnessCheck = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastStockDataUpdate.current;
      if (timeSinceLastUpdate > 60000) { // 60 seconds
        console.log('⚠️ Stock data seems stale, marking as unsubscribed...');
        isSubscribedToStocks.current = false;
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(dataFreshnessCheck);
  }, []);

  // Intelligent subscription management - ensures we stay subscribed without spam
  useEffect(() => {
    if (state.isConnected && socketRef.current) {
      // Check subscription status more frequently but only re-subscribe if needed
      subscriptionCheckRef.current = setInterval(() => {
        if (socketRef.current && state.isConnected && !isSubscribedToStocks.current) {
          console.log('🔄 Re-establishing stock subscription...');
          socketRef.current.emit('subscribe-stocks');
        }
      }, 30000); // Check every 30 seconds for faster recovery
      
      return () => {
        if (subscriptionCheckRef.current) {
          clearInterval(subscriptionCheckRef.current);
        }
      };
    }
  }, [state.isConnected]);

  // Initialize socket connection and fetch initial data
  useEffect(() => {
    // Fetch initial stock data before socket connection
    const fetchInitialStockData = async () => {
      if (!isAuthenticated || !token) return;
      
      try {
        console.log('📊 Fetching initial stock data...');
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/stocks/live-prices`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log('✅ Initial stock data loaded:', {
              stockCount: result.data.stocks?.length || 0,
              marketStatus: result.data.marketStatus,
              isMarketOpen: result.data.isMarketOpen
            });
            
            dispatch({ 
              type: 'UPDATE_STOCK_DATA', 
              payload: {
                stocks: result.data.stocks || [],
                marketStatus: result.data.marketStatus,
                isMarketOpen: result.data.isMarketOpen,
                lastUpdated: result.data.lastUpdated
              }
            });
          }
        } else {
          console.error('❌ Failed to fetch initial stock data:', response.status);
        }
      } catch (error) {
        console.error('❌ Error fetching initial stock data:', error);
        // Set default fallback state
        dispatch({ 
          type: 'UPDATE_STOCK_DATA', 
          payload: {
            stocks: [],
            marketStatus: 'CLOSED',
            isMarketOpen: false,
            lastUpdated: new Date()
          }
        });
      }
    };

    if (isAuthenticated && token) {
      // First, fetch initial data
      fetchInitialStockData();
      // Then establish socket connection after a small delay
      const timer = setTimeout(() => {
        connectSocket();
      }, 500);
      
      return () => clearTimeout(timer);
    } else if (socketRef.current) {
      disconnectSocket();
    }

    return () => {
      if (socketRef.current) {
        disconnectSocket();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (subscriptionCheckRef.current) {
        clearInterval(subscriptionCheckRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  // Connect to socket

  // Connect to socket
  const connectSocket = () => {
    if (socketRef.current) {
      disconnectSocket();
    }

    try {
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? process.env.REACT_APP_SOCKET_URL_PROD 
        : process.env.REACT_APP_SOCKET_URL;

      socketRef.current = io(serverUrl, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        timeout: 20000,
        forceNew: true
      });

      const socket = socketRef.current;

      // Connection events
      socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id);
        dispatch({ type: 'SOCKET_CONNECT', payload: socket });
        reconnectAttempts.current = 0;
        
        // Authenticate with the server
        if (token) {
          console.log('🔑 Authenticating socket...');
          socket.emit('authenticate', token);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        isSubscribedToStocks.current = false; // Reset subscription status on disconnect
        dispatch({ type: 'SOCKET_DISCONNECT' });
        
        // Attempt to reconnect if it's not a manual disconnect
        if (reason !== 'io client disconnect') {
          attemptReconnect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        dispatch({ type: 'SOCKET_ERROR', payload: error.message });
        attemptReconnect();
      });

      // Authentication events
      socket.on('authenticated', (data) => {
        if (data.success) {
          console.log('✅ Socket authenticated for user:', data.user?.email);
          // Subscribe to real-time updates with a slight delay to ensure connection is stable
          setTimeout(() => {
            subscribeToStockUpdates();
            subscribeToPortfolioUpdates();
          }, 100);
        } else {
          console.error('❌ Socket authentication failed:', data.message);
          toast.error('Real-time connection authentication failed');
        }
      });

      // Stock data events
      socket.on('stock-data', (data) => {
        console.log('📊 Received stock data update:', {
          stockCount: data.stocks?.length || 0,
          lastUpdated: data.lastUpdated,
          marketStatus: data.marketStatus,
          isMarketOpen: data.isMarketOpen
        });
        isSubscribedToStocks.current = true; // Confirm we're receiving data
        lastStockDataUpdate.current = Date.now(); // Track when we last received data
        dispatch({ type: 'UPDATE_STOCK_DATA', payload: data });
      });

      // Portfolio update events
      socket.on('portfolio-update', (data) => {
        dispatch({ type: 'UPDATE_PORTFOLIO_DATA', payload: data });
      });

      // Error events
      socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
        toast.error(error.message || 'Connection error occurred');
      });

    } catch (error) {
      console.error('❌ Socket initialization error:', error);
      dispatch({ type: 'SOCKET_ERROR', payload: error.message });
    }
  };

  // Disconnect socket
  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      isSubscribedToStocks.current = false; // Reset subscription status
      dispatch({ type: 'SOCKET_DISCONNECT' });
    }
  };

  // Attempt to reconnect
  const attemptReconnect = () => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
      reconnectAttempts.current++;
      
      console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isAuthenticated && token) {
          connectSocket();
        }
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      toast.error('Lost connection to server. Please refresh the page.');
    }
  };

  // Subscribe to stock updates
  const subscribeToStockUpdates = () => {
    if (socketRef.current && state.isConnected) {
      console.log('📈 Attempting to subscribe to stock updates...');
      socketRef.current.emit('subscribe-stocks');
      isSubscribedToStocks.current = true;
      console.log('📈 Subscribe request sent');
    } else {
      console.warn('⚠️ Cannot subscribe to stock updates - socket not connected:', {
        hasSocket: !!socketRef.current,
        isConnected: state.isConnected
      });
    }
  };

  // Unsubscribe from stock updates
  const unsubscribeFromStockUpdates = () => {
    if (socketRef.current && state.isConnected) {
      socketRef.current.emit('unsubscribe-stocks');
      isSubscribedToStocks.current = false;
      console.log('📉 Unsubscribed from stock updates');
    }
  };

  // Subscribe to portfolio updates
  const subscribeToPortfolioUpdates = () => {
    if (socketRef.current && state.isConnected && user) {
      socketRef.current.emit('subscribe-portfolio');
      console.log('💼 Subscribed to portfolio updates');
    }
  };

  // Unsubscribe from portfolio updates
  const unsubscribeFromPortfolioUpdates = () => {
    if (socketRef.current && state.isConnected) {
      socketRef.current.emit('unsubscribe-portfolio');
      console.log('💼 Unsubscribed from portfolio updates');
    }
  };

  // Manually refresh stock data
  const refreshStockData = () => {
    if (socketRef.current && state.isConnected) {
      console.log('🔄 Manual refresh - subscribing to stock updates...');
      socketRef.current.emit('subscribe-stocks');
      isSubscribedToStocks.current = true;
    } else {
      console.warn('⚠️ Cannot refresh stock data - socket not ready:', {
        hasSocket: !!socketRef.current,
        isConnected: state.isConnected
      });
    }
  };

  // Test function to manually force subscription (for debugging)
  const forceResubscribe = () => {
    console.log('🔧 FORCE RE-SUBSCRIBE: Manually triggering subscription...');
    isSubscribedToStocks.current = false;
    if (socketRef.current && state.isConnected) {
      socketRef.current.emit('subscribe-stocks');
    }
  };

  // Clear connection error
  const clearConnectionError = () => {
    dispatch({ type: 'CLEAR_CONNECTION_ERROR' });
  };

  // Get stock by instrument key
  const getStockByInstrumentKey = (instrumentKey) => {
    return state.stockData.stocks.find(stock => stock.instrumentKey === instrumentKey);
  };

  // Get stocks sorted by performance
  const getTopGainers = (limit = 5) => {
    return state.stockData.stocks
      .filter(stock => stock.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, limit);
  };

  const getTopLosers = (limit = 5) => {
    return state.stockData.stocks
      .filter(stock => stock.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, limit);
  };

  // Context value
  const value = {
    ...state,
    connectSocket,
    disconnectSocket,
    subscribeToStockUpdates,
    unsubscribeFromStockUpdates,
    subscribeToPortfolioUpdates,
    unsubscribeFromPortfolioUpdates,
    refreshStockData,
    clearConnectionError,
    forceResubscribe,
    getStockByInstrumentKey,
    getTopGainers,
    getTopLosers
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
