const mongoose = require('mongoose');
const { PortfolioSnapshot } = require('./models/PortfolioAnalytics');

// Load environment variables
require('dotenv').config();

async function checkAllSnapshots() {
  try {
    await mongoose.connect('mongodb://localhost:27017/stock-simulator', { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    
    const allSnapshots = await PortfolioSnapshot.find({});
    console.log('Total snapshots in database:', allSnapshots.length);
    
    allSnapshots.forEach((s, i) => {
      console.log(`${i+1}. User: ${s.userId}, Date: ${s.date}, Value: ₹${s.totalValue}, Invested: ₹${s.totalInvested}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllSnapshots();
