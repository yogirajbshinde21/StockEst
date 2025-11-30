/**
 * Delete Demo User from Production MongoDB
 * This will delete the demo user so it can be recreated with correct password
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function deleteDemoUser() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    console.log('🗑️  Deleting demo user...');
    
    const result = await User.deleteOne({ email: 'demo@stocksimulator.com' });
    
    if (result.deletedCount > 0) {
      console.log('✅ Demo user deleted successfully!');
      console.log('📧 Email: demo@stocksimulator.com');
      console.log('ℹ️  Run the deployment again to recreate with correct password');
    } else {
      console.log('⚠️  No demo user found to delete');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  }
}

deleteDemoUser();
