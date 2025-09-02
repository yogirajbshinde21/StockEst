const mongoose = require('mongoose');
const { PortfolioAnalytics } = require('./models/PortfolioAnalytics');
const User = require('./models/User');

// Load environment variables
require('dotenv').config();

async function clearCachedAnalytics() {
  try {
    await mongoose.connect('mongodb://localhost:27017/stock-simulator', { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    
    const user = await User.findOne({email: 'test@analytics.com'});
    await PortfolioAnalytics.deleteOne({userId: user._id});
    console.log('✅ Deleted cached analytics record for user');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

clearCachedAnalytics();
