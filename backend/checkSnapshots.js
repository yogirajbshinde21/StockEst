const mongoose = require('mongoose');
const { PortfolioSnapshot } = require('./models/PortfolioAnalytics');
const User = require('./models/User');

// Load environment variables
require('dotenv').config();

async function checkSnapshots() {
  try {
    await mongoose.connect('mongodb://localhost:27017/stock-simulator', { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    
    const user = await User.findOne({email: 'test@analytics.com'});
    console.log('User ID:', user._id);
    
    const snapshots = await PortfolioSnapshot.find({userId: user._id});
    console.log('Found snapshots for user:', snapshots.length);
    
    snapshots.forEach((s, i) => {
      console.log(`${i+1}. ${s.date} - Value: ₹${s.totalValue}, Invested: ₹${s.totalInvested}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSnapshots();
