import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, Users, Shield, Smartphone } from 'lucide-react';
import LanguageSelector from '../components/LanguageSelector';
import Trans from '../components/Trans';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();

  // Memoize clearError to prevent infinite re-renders
  const memoizedClearError = useCallback(() => {
    if (clearError) clearError();
  }, [clearError]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      memoizedClearError();
    };
  }, [memoizedClearError]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing, but only if there's an error
    if (error && clearError) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="auth-container">
      {/* Language Selector */}
      <div className="auth-language-selector">
        <LanguageSelector showFullNames={true} />
      </div>

      {/* Left Panel - Features */}
      <div className="auth-left-panel">
        <div className="auth-brand">
          <TrendingUp className="brand-icon" />
          <h1><Trans>Stock Simulator</Trans></h1>
          <p><Trans>Learn Trading with Virtual Money</Trans></p>
        </div>

        <div className="features-list">
          <div className="feature-item">
            <Users className="feature-icon" />
            <div>
              <h3><Trans>Educational Platform</Trans></h3>
              <p><Trans>Perfect for rural students and beginners to learn stock trading</Trans></p>
            </div>
          </div>
          
          <div className="feature-item">
            <TrendingUp className="feature-icon" />
            <div>
              <h3><Trans>Real-time Data</Trans></h3>
              <p><Trans>Practice with live stock prices from Indian markets</Trans></p>
            </div>
          </div>
          
          <div className="feature-item">
            <Shield className="feature-icon" />
            <div>
              <h3><Trans>Risk-free Learning</Trans></h3>
              <p><Trans>Trade with virtual ₹1,00,000 without any real money risk</Trans></p>
            </div>
          </div>
          
          <div className="feature-item">
            <Smartphone className="feature-icon" />
            <div>
              <h3><Trans>Mobile Friendly</Trans></h3>
              <p><Trans>Access your portfolio anywhere, optimized for mobile devices</Trans></p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="auth-right-panel">
        <div className="auth-form-container">
          <div className="auth-header">
            <h2><Trans>Welcome Back</Trans></h2>
            <p><Trans>Sign in to your account to continue trading</Trans></p>
          </div>

          {error && (
            <div className="error-message">
              <span><Trans>{error}</Trans></span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email"><Trans>Email Address</Trans></label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password"><Trans>Password</Trans></label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`auth-submit-btn ${isSubmitting ? 'loading' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner"></div>
                  <Trans>Signing in...</Trans>
                </>
              ) : (
                <Trans>Sign In</Trans>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              <Trans>Don't have an account?</Trans>{' '}
              <Link to="/register" className="auth-link">
                <Trans>Sign up here</Trans>
              </Link>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="demo-credentials">
            <h4><Trans>Quick Demo Access</Trans></h4>
            <p><Trans>Use these credentials to try the platform:</Trans></p>
            <div className="demo-info">
              <strong><Trans>Email:</Trans></strong> demo@stocksimulator.com<br />
              <strong><Trans>Password:</Trans></strong> Demo123
            </div>
            <button
              type="button"
              className="demo-fill-btn"
              onClick={() => {
                setFormData({
                  email: 'demo@stocksimulator.com',
                  password: 'Demo123'
                });
              }}
              disabled={isSubmitting}
            >
              Fill Demo Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
