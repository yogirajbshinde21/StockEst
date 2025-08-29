import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { SocketProvider } from './context/SocketContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StockTicker from './components/StockTicker';
import './App.css';

// Configure axios with base URL from environment variables
axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
axios.defaults.withCredentials = true;

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <p>Loading...</p>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
}

// Public Route Component (redirect to dashboard if already logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <p>Loading...</p>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" /> : children;
}

// Main App Component
function AppContent() {
  const { user } = useAuth();
  
  return (
    <div className="app">
      {/* Stock Ticker - Only show for authenticated users */}
      {user && (
        <SocketProvider>
          <StockTicker />
        </SocketProvider>
      )}
      
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Routes>
          {/* Landing Page */}
          <Route 
            path="/" 
            element={<Landing />} 
          />
          
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <SocketProvider>
                  <Dashboard />
                </SocketProvider>
              </ProtectedRoute>
            } 
          />
          
          {/* Catch all route */}
          <Route 
            path="*" 
            element={<Navigate to="/" />} 
          />
        </Routes>
      </Router>
      
      {/* Global Toast Notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            fontSize: '14px',
            borderRadius: '8px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

// Main App with Providers
function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
