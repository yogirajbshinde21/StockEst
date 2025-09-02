const mongoose = require('mongoose');
const User = require('./models/User');
const portfolioAnalyticsService = require('./services/PortfolioAnalyticsService');

// Load environment variables
require('dotenv').config();

async function testTimelineGeneration() {
  try {
    await mongoose.connect('mongodb://localhost:27017/stock-simulator', { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    
    const user = await User.findOne({email: 'test@analytics.com'});
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('=== TESTING TIMELINE GENERATION ===');
    console.log('User:', user.email);
    
    const timeline = await portfolioAnalyticsService.generateTimelineFromUserData(user._id, 30);
    
    console.log('\n=== GENERATED TIMELINE ===');
    timeline.forEach((point, index) => {
      console.log(`${index + 1}. Date: ${point.date}`);
      console.log(`   Total Value: ₹${point.totalValue}`);
      console.log(`   Total Invested: ₹${point.totalInvested}`);
      console.log(`   P/L: ₹${point.totalProfitLoss} (${point.totalProfitLossPercent}%)`);
      console.log(`   Day Change: ₹${point.dayChange} (${point.dayChangePercent}%)`);
      console.log('');
    });
    
    console.log('\n=== EXPECTED VALUES ===');
    console.log('Current Portfolio Value:', user.totalPortfolioValue);
    console.log('Current Total Invested:', user.totalInvested);
    console.log('Current P/L:', user.totalProfitLoss);
    console.log('Current P/L %:', user.totalProfitLossPercent);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testTimelineGeneration();
