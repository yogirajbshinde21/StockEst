const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User');

// Load environment variables
require('dotenv').config();

async function testAnalyticsAPI() {
  try {
    // Connect to get user
    await mongoose.connect('mongodb://localhost:27017/stock-simulator', { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    
    const user = await User.findOne({email: 'test@analytics.com'});
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('🔍 Testing with user ID:', user._id);

    // Create a JWT token for the user (using userId field that auth middleware expects)
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email 
      }, 
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    console.log('🔑 Token created');

    // Test the dashboard data API
    const response = await axios.get('http://localhost:5000/api/analytics/dashboard-data?timeframe=30', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API Response Status:', response.status);
    console.log('📊 Timeline data points:', response.data.data.timeline?.length || 0);
    console.log('📈 Analytics data:', response.data.data.analytics ? 'Present' : 'Missing');
    console.log('🏆 Milestones:', response.data.data.milestones?.length || 0);

    if (response.data.data.timeline && response.data.data.timeline.length > 0) {
      console.log('📊 Sample timeline point:', response.data.data.timeline[0]);
    }

    if (response.data.data.analytics) {
      console.log('📈 Analytics performance:', response.data.data.analytics.performance);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing analytics API:', error.response?.data || error.message);
    process.exit(1);
  }
}

testAnalyticsAPI();
