import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// AuthContext for managing user authentication state
const AuthContext = createContext();

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  error: null
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    
    case 'AUTH_SUCCESS':
      // Store token in localStorage
      if (action.payload.token) {
        localStorage.setItem('token', action.payload.token);
      }
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token || state.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    
    case 'AUTH_ERROR':
      localStorage.removeItem('token');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    
    case 'LOGOUT':
      localStorage.removeItem('token');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    
    default:
      return state;
  }
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set up axios interceptors
  useEffect(() => {
    // Request interceptor to add auth token
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          dispatch({ type: 'LOGOUT' });
          toast.error('Session expired. Please login again.');
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptors
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      try {
        const response = await axios.get('/api/auth/me');
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: response.data.data.user,
            token: token
          }
        });
      } catch (error) {
        console.error('Auth check failed:', error);
        dispatch({ type: 'AUTH_ERROR', payload: 'Authentication failed' });
      }
    };

    // Only run on mount
    checkAuth();
  }, []); // Empty dependency array - only run once on mount

  // Login function
  const login = async (email, password) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: response.data.data
      });

      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Register function
  const register = async (name, email, password) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response = await axios.post('/api/auth/register', {
        name,
        email,
        password
      });

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: response.data.data
      });

      toast.success('Registration successful! Welcome to Stock Simulator!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
      toast.success('Logged out successfully');
    }
  };

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/auth/profile', profileData);
      
      dispatch({
        type: 'UPDATE_USER',
        payload: response.data.data.user
      });

      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Change password function
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.post('/api/auth/change-password', {
        currentPassword,
        newPassword
      });

      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password change failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update user balance and portfolio (called from trading operations)
  const updateUserData = (userData) => {
    dispatch({
      type: 'UPDATE_USER',
      payload: userData
    });
  };

  // Clear error function (memoized to prevent infinite re-renders)
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Context value
  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    updateUserData,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
