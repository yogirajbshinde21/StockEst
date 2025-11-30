/**
 * Create Demo User Script
 * Creates a demo user account with predefined credentials
 * Run this script: node createDemoUser.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const DEMO_USER = {
  email: 'demo@stocksimulator.com',
  password: 'Demo123',
  name: 'Demo User',
  balance: 100000, // Starting with ₹1,00,000
  portfolio: []
};

async function createDemoUser() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/stock-simulator';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');

    // Check if demo user already exists
    const existingUser = await User.findOne({ email: DEMO_USER.email });
    
    if (existingUser) {
      console.log('✅ Demo user already exists - skipping creation');
      console.log('📧 Email:', DEMO_USER.email);
      console.log('💰 Current Balance: ₹' + (existingUser.balance || 0).toLocaleString('en-IN'));
      console.log('📊 Portfolio Items:', existingUser.portfolio?.length || 0);
      console.log('ℹ️  To reset demo user, delete it from database first');
    } else {
      // Create new demo user
      const hashedPassword = await bcrypt.hash(DEMO_USER.password, 10);
      
      const demoUser = new User({
        email: DEMO_USER.email,
        password: hashedPassword,
        name: DEMO_USER.name,
        balance: DEMO_USER.balance,
        portfolio: [],
        watchlist: [],
        achievements: []
      });

      await demoUser.save();
      
      console.log('✅ Demo user created successfully!');
      console.log('📧 Email:', DEMO_USER.email);
      console.log('🔑 Password:', DEMO_USER.password);
      console.log('💰 Balance: ₹' + DEMO_USER.balance.toLocaleString('en-IN'));
      
      console.log('\n🎉 Demo user is ready to use!');
      console.log('You can now login with:');
      console.log('   Email:', DEMO_USER.email);
      console.log('   Password:', DEMO_USER.password);
    }
    
  } catch (error) {
    console.error('❌ Error creating demo user:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
}

// Run the script
createDemoUser();
