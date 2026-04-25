const mongoose = require('mongoose');
const User = require('../models/User');
const RFQ = require('../models/RFQ');
const Bid = require('../models/Bid');
require('dotenv').config();

const resetDemoData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rfq-platform');
    console.log('Connected to MongoDB');

    // Delete all demo data (users created by seed script)
    const demoUsers = await User.deleteMany({ 
      email: { $in: [
        'buyer@demo.com',
        'supplier1@demo.com',
        'supplier2@demo.com',
        'admin@demo.com'
      ]}
    });
    console.log(`Deleted ${demoUsers.deletedCount} demo users`);

    // Delete all RFQs
    const rfqCount = await RFQ.deleteMany({});
    console.log(`Deleted ${rfqCount.deletedCount} RFQs`);

    // Delete all bids
    const bidCount = await Bid.deleteMany({});
    console.log(`Deleted ${bidCount.deletedCount} bids`);

    console.log('Demo data reset complete');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting demo data:', error);
    process.exit(1);
  }
};

const resetAllData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rfq-platform');
    console.log('Connected to MongoDB');

    // WARNING: This deletes ALL data
    console.log('WARNING: This will delete ALL data including real user data!');
    console.log('To proceed, set environment variable CONFIRM_RESET=true');
    
    if (process.env.CONFIRM_RESET !== 'true') {
      console.log('Aborting. Set CONFIRM_RESET=true to proceed.');
      process.exit(1);
    }

    // Delete all data
    await User.deleteMany({});
    await RFQ.deleteMany({});
    await Bid.deleteMany({});

    console.log('All data reset complete');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting all data:', error);
    process.exit(1);
  }
};

// Run based on command line argument
const command = process.argv[2];
if (command === 'demo') {
  resetDemoData();
} else if (command === 'all') {
  resetAllData();
} else {
  console.log('Usage: node resetData.js [demo|all]');
  console.log('  demo  - Reset only demo data (safe)');
  console.log('  all   - Reset ALL data (requires CONFIRM_RESET=true)');
  process.exit(1);
}
