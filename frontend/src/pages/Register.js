import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false
  });

  const { register, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  // Validate password strength
  useEffect(() => {
    const password = formData.password;
    setPasswordValidation({
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password)
    });
  }, [formData.password]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (formData.password !== formData.confirmPassword) {
      return;
    }
    
    const { length, uppercase, lowercase, number } = passwordValidation;
    if (!length || !uppercase || !lowercase || !number) {
      return;
    }

    setIsSubmitting(true);
    
    const result = await register(formData.name, formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    }
    
    setIsSubmitting(false);
  };

  const isPasswordMatch = formData.password === formData.confirmPassword;
  const isFormValid = formData.name.trim() && 
                     formData.email.trim() && 
                     passwordValidation.length && 
                     passwordValidation.uppercase && 
                     passwordValidation.lowercase && 
                     passwordValidation.number && 
                     isPasswordMatch;

  return (
    <div className="auth-container">
      {/* Left Panel - Welcome */}
      <div className="auth-left-panel">
        <div className="auth-brand">
          <TrendingUp className="brand-icon" />
          <h1>Join Stock Simulator</h1>
          <p>Start your trading journey with virtual money</p>
        </div>

        <div className="features-list">
          <div className="feature-item">
            <CheckCircle className="feature-icon" />
            <div>
              <h3>₹1,00,000 Virtual Money</h3>
              <p>Start trading immediately with virtual balance</p>
            </div>
          </div>
          
          <div className="feature-item">
            <CheckCircle className="feature-icon" />
            <div>
              <h3>Real Market Data</h3>
              <p>Learn with live prices from Indian stock markets</p>
            </div>
          </div>
          
          <div className="feature-item">
            <CheckCircle className="feature-icon" />
            <div>
              <h3>Track Performance</h3>
              <p>Monitor your portfolio and trading performance</p>
            </div>
          </div>
          
          <div className="feature-item">
            <CheckCircle className="feature-icon" />
            <div>
              <h3>Learn Trading</h3>
              <p>Perfect for students and beginners to learn</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="auth-right-panel">
        <div className="auth-form-container">
          <div className="auth-header">
            <h2>Create Account</h2>
            <p>Join thousands learning to trade</p>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
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
              <label htmlFor="password">Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Create a strong password"
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
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-requirements">
                    <div className={`requirement ${passwordValidation.length ? 'met' : ''}`}>
                      <CheckCircle size={16} />
                      <span>At least 6 characters</span>
                    </div>
                    <div className={`requirement ${passwordValidation.uppercase ? 'met' : ''}`}>
                      <CheckCircle size={16} />
                      <span>One uppercase letter</span>
                    </div>
                    <div className={`requirement ${passwordValidation.lowercase ? 'met' : ''}`}>
                      <CheckCircle size={16} />
                      <span>One lowercase letter</span>
                    </div>
                    <div className={`requirement ${passwordValidation.number ? 'met' : ''}`}>
                      <CheckCircle size={16} />
                      <span>One number</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirm your password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              
              {formData.confirmPassword && !isPasswordMatch && (
                <div className="password-mismatch">
                  <AlertCircle size={16} />
                  <span>Passwords do not match</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className={`auth-submit-btn ${isSubmitting ? 'loading' : ''} ${!isFormValid ? 'disabled' : ''}`}
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner"></div>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
            <p className="back-to-landing">
              <Link to="/" className="auth-link">
                ← Back to Landing Page
              </Link>
            </p>
          </div>

          {/* Terms Notice */}
          <div className="terms-notice">
            <p>
              By creating an account, you agree to practice trading with virtual money only. 
              This is an educational platform and no real money is involved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
