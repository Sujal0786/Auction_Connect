require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const RFQ = require('../models/RFQ');
const Bid = require('../models/Bid');
const ActivityLog = require('../models/ActivityLog');
const connectDB = require('../config/db');

const seedData = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await RFQ.deleteMany({});
    await Bid.deleteMany({});
    await ActivityLog.deleteMany({});
    console.log('Cleared existing data');

    // Create demo users
    const users = await User.create([
      {
        name: 'John Buyer',
        email: 'buyer@gocomet.test',
        passwordHash: '123456',
        role: 'buyer',
        companyName: 'Global Logistics Inc',
        phone: '+1-555-0101'
      },
      {
        name: 'Alice Supplier',
        email: 'supplier1@gocomet.test',
        passwordHash: '123456',
        role: 'supplier',
        companyName: 'Fast Freight Services',
        phone: '+1-555-0102'
      },
      {
        name: 'Bob Supplier',
        email: 'supplier2@gocomet.test',
        passwordHash: '123456',
        role: 'supplier',
        companyName: 'Express Shipping Co',
        phone: '+1-555-0103'
      },
      {
        name: 'Charlie Supplier',
        email: 'supplier3@gocomet.test',
        passwordHash: '123456',
        role: 'supplier',
        companyName: 'Quick Transport Ltd',
        phone: '+1-555-0104'
      },
      {
        name: 'Admin User',
        email: 'admin@gocomet.test',
        passwordHash: '123456',
        role: 'admin',
        companyName: 'Platform Admin',
        phone: '+1-555-0100'
      }
    ]);

    console.log('Created demo users');

    const buyer = users[0];
    const suppliers = users.slice(1, 4);

    // Create demo RFQs
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const rfqs = await RFQ.create([
      {
        rfqName: 'Shanghai to Los Angeles Freight',
        referenceId: 'RFQ-SHA-LAX-001',
        description: '20ft container shipment from Shanghai to Los Angeles',
        serviceType: 'FCL',
        pickupLocation: 'Shanghai, China',
        deliveryLocation: 'Los Angeles, USA',
        pickupDate: nextWeek,
        bidStartTime: now,
        originalCloseTime: tomorrow,
        currentCloseTime: tomorrow,
        forcedCloseTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        triggerWindowMinutes: 10,
        extensionDurationMinutes: 10,
        triggerType: 'BID_RECEIVED',
        auctionEnabled: true,
        status: 'ACTIVE',
        createdBy: buyer._id,
        invitedSuppliers: suppliers.map(s => s._id),
        estimatedValue: 5000,
        currency: 'USD'
      },
      {
        rfqName: 'Mumbai to Dubai Logistics',
        referenceId: 'RFQ-BOM-DXB-002',
        description: 'Full truck load from Mumbai to Dubai',
        serviceType: 'ROAD',
        pickupLocation: 'Mumbai, India',
        deliveryLocation: 'Dubai, UAE',
        pickupDate: new Date(nextWeek.getTime() + 7 * 24 * 60 * 60 * 1000),
        bidStartTime: tomorrow,
        originalCloseTime: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
        currentCloseTime: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
        forcedCloseTime: new Date(tomorrow.getTime() + 48 * 60 * 60 * 1000),
        triggerWindowMinutes: 15,
        extensionDurationMinutes: 15,
        triggerType: 'L1_CHANGE',
        auctionEnabled: true,
        status: 'UPCOMING',
        createdBy: buyer._id,
        invitedSuppliers: suppliers.map(s => s._id),
        estimatedValue: 3500,
        currency: 'USD'
      }
    ]);

    console.log('Created demo RFQs');

    // Create demo bids for the active RFQ
    const activeRFQ = rfqs[0];
    const bids = await Bid.create([
      {
        rfqId: activeRFQ._id,
        supplierId: suppliers[0]._id,
        carrierName: 'Maersk',
        freightCharges: 3500,
        originCharges: 200,
        destinationCharges: 300,
        taxes: 150,
        discount: 50,
        totalAmount: 4100,
        transitTime: 15,
        quoteValidity: nextWeek,
        remarks: 'Direct shipment, no transshipment',
        rankAtSubmission: 1
      },
      {
        rfqId: activeRFQ._id,
        supplierId: suppliers[1]._id,
        carrierName: 'Hapag-Lloyd',
        freightCharges: 3800,
        originCharges: 180,
        destinationCharges: 280,
        taxes: 140,
        discount: 40,
        totalAmount: 4360,
        transitTime: 18,
        quoteValidity: nextWeek,
        remarks: 'Reliable service with tracking',
        rankAtSubmission: 2
      },
      {
        rfqId: activeRFQ._id,
        supplierId: suppliers[2]._id,
        carrierName: 'CMA CGM',
        freightCharges: 4200,
        originCharges: 220,
        destinationCharges: 320,
        taxes: 160,
        discount: 60,
        totalAmount: 4640,
        transitTime: 20,
        quoteValidity: nextWeek,
        remarks: 'Competitive pricing',
        rankAtSubmission: 3
      }
    ]);

    console.log('Created demo bids');

    // Create activity logs
    await ActivityLog.create([
      {
        rfqId: activeRFQ._id,
        actorId: buyer._id,
        actorRole: 'buyer',
        actionType: 'RFQ_CREATED',
        message: 'RFQ created: Shanghai to Los Angeles Freight',
        metadata: { referenceId: activeRFQ.referenceId }
      },
      {
        rfqId: activeRFQ._id,
        actorId: suppliers[0]._id,
        actorRole: 'supplier',
        actionType: 'BID_SUBMITTED',
        message: 'Bid submitted: $4,100.00',
        metadata: { bidId: bids[0]._id, totalAmount: 4100, rank: 1 }
      },
      {
        rfqId: activeRFQ._id,
        actorId: suppliers[1]._id,
        actorRole: 'supplier',
        actionType: 'BID_SUBMITTED',
        message: 'Bid submitted: $4,360.00',
        metadata: { bidId: bids[1]._id, totalAmount: 4360, rank: 2 }
      },
      {
        rfqId: activeRFQ._id,
        actorId: suppliers[2]._id,
        actorRole: 'supplier',
        actionType: 'BID_SUBMITTED',
        message: 'Bid submitted: $4,640.00',
        metadata: { bidId: bids[2]._id, totalAmount: 4640, rank: 3 }
      }
    ]);

    console.log('Created activity logs');

    console.log('\n=== Seed Data Created Successfully ===');
    console.log('\nDemo Credentials:');
    console.log('Buyer: buyer@gocomet.test / 123456');
    console.log('Supplier 1: supplier1@gocomet.test / 123456');
    console.log('Supplier 2: supplier2@gocomet.test / 123456');
    console.log('Supplier 3: supplier3@gocomet.test / 123456');
    console.log('Admin: admin@gocomet.test / 123456');
    console.log('\nActive RFQ: Shanghai to Los Angeles Freight');
    console.log('Upcoming RFQ: Mumbai to Dubai Logistics');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
