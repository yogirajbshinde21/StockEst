const mongoose = require('mongoose');
const User = require('./models/User');

async function createTestUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/stock-simulator', { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    
    console.log('Connected to MongoDB');
    
    const testUser = new User({
      name: 'Test User',
      email: 'test@analytics.com',
      password: 'testpassword',
      virtualBalance: 50000,
      totalInvested: 25000,
      totalPortfolioValue: 28500,
      totalProfitLoss: 3500,
      totalProfitLossPercent: 14.0,
      portfolio: [
        {
          symbol: 'RELIANCE',
          instrumentKey: 'NSE_EQ|INE002A01018',
          companyName: 'Reliance Industries Ltd',
          quantity: 10,
          averagePrice: 2500,
          currentPrice: 2650,
          totalInvested: 25000,
          currentValue: 26500,
          profitLoss: 1500,
          profitLossPercent: 6.0
        },
        {
          symbol: 'TCS',
          instrumentKey: 'NSE_EQ|INE467B01029',
          companyName: 'Tata Consultancy Services Ltd',
          quantity: 5,
          averagePrice: 3000,
          currentPrice: 3400,
          totalInvested: 15000,
          currentValue: 17000,
          profitLoss: 2000,
          profitLossPercent: 13.33
        }
      ],
      transactions: [
        {
          type: 'BUY',
          symbol: 'RELIANCE',
          instrumentKey: 'NSE_EQ|INE002A01018',
          companyName: 'Reliance Industries Ltd',
          quantity: 10,
          price: 2500,
          totalAmount: 25000,
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          originalInvestment: 25000
        },
        {
          type: 'BUY',
          symbol: 'TCS',
          instrumentKey: 'NSE_EQ|INE467B01029',
          companyName: 'Tata Consultancy Services Ltd',
          quantity: 5,
          price: 3000,
          totalAmount: 15000,
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          originalInvestment: 15000
        },
        {
          type: 'SELL',
          symbol: 'RELIANCE',
          instrumentKey: 'NSE_EQ|INE002A01018',
          companyName: 'Reliance Industries Ltd',
          quantity: 2,
          price: 2600,
          totalAmount: 5200,
          profitLoss: 200,
          profitLossPercent: 4.0,
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          originalInvestment: 5000
        }
      ]
    });
    
    const savedUser = await testUser.save();
    console.log('✅ Test user created with ID:', savedUser._id);
    console.log('📊 Portfolio items:', savedUser.portfolio.length);
    console.log('💰 Total Portfolio Value:', savedUser.totalPortfolioValue);
    console.log('📈 Total P/L:', savedUser.totalProfitLoss);
    console.log('🔄 Transactions:', savedUser.transactions.length);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUser();
