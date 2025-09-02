const mongoose = require('mongoose');
const User = require('./models/User');

// Load environment variables
require('dotenv').config();

async function debugUserData() {
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

    console.log('=== USER DATA DEBUG ===');
    console.log('User ID:', user._id);
    console.log('Virtual Balance:', user.virtualBalance);
    console.log('Total Invested:', user.totalInvested);
    console.log('Total Portfolio Value:', user.totalPortfolioValue);
    console.log('Total P/L:', user.totalProfitLoss);
    console.log('Total P/L %:', user.totalProfitLossPercent);
    
    console.log('\n=== PORTFOLIO ===');
    user.portfolio.forEach((item, index) => {
      console.log(`${index + 1}. ${item.symbol} (${item.companyName})`);
      console.log(`   Quantity: ${item.quantity}`);
      console.log(`   Avg Price: ₹${item.averagePrice}`);
      console.log(`   Current Price: ₹${item.currentPrice}`);
      console.log(`   Invested: ₹${item.totalInvested}`);
      console.log(`   Current Value: ₹${item.currentValue}`);
      console.log(`   P/L: ₹${item.profitLoss} (${item.profitLossPercent}%)`);
      console.log('');
    });
    
    console.log('\n=== TRANSACTIONS ===');
    user.transactions.forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.type} ${txn.quantity} ${txn.symbol} @ ₹${txn.price}`);
      console.log(`   Total Amount: ₹${txn.totalAmount}`);
      console.log(`   P/L: ₹${txn.profitLoss || 0} (${txn.profitLossPercent || 0}%)`);
      console.log(`   Original Investment: ₹${txn.originalInvestment || 0}`);
      console.log(`   Date: ${txn.timestamp}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugUserData();
