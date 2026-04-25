const mongoose = require('mongoose');

const rfqSchema = new mongoose.Schema({
  rfqName: {
    type: String,
    required: [true, 'RFQ name is required'],
    trim: true
  },
  referenceId: {
    type: String,
    required: [true, 'Reference ID is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  serviceType: {
    type: String,
    required: [true, 'Service type is required'],
    enum: ['FCL', 'LCL', 'AIR', 'ROAD', 'RAIL']
  },
  pickupLocation: {
    type: String,
    required: [true, 'Pickup location is required'],
    trim: true
  },
  deliveryLocation: {
    type: String,
    required: [true, 'Delivery location is required'],
    trim: true
  },
  pickupDate: {
    type: Date,
    required: [true, 'Pickup date is required']
  },
  // Auction Timing
  bidStartTime: {
    type: Date,
    required: [true, 'Bid start time is required']
  },
  originalCloseTime: {
    type: Date,
    required: [true, 'Original close time is required']
  },
  currentCloseTime: {
    type: Date,
    required: [true, 'Current close time is required']
  },
  forcedCloseTime: {
    type: Date
  },
  // British Auction Configuration
  triggerWindowMinutes: {
    type: Number,
    default: 10,
    min: 1
  },
  extensionDurationMinutes: {
    type: Number,
    default: 10,
    min: 1
  },
  triggerType: {
    type: String,
    enum: ['BID_RECEIVED', 'ANY_RANK_CHANGE', 'L1_CHANGE'],
    default: 'BID_RECEIVED'
  },
  auctionEnabled: {
    type: Boolean,
    default: true
  },
  extensionCount: {
    type: Number,
    default: 0
  },
  // Status
  status: {
    type: String,
    enum: ['DRAFT', 'UPCOMING', 'ACTIVE', 'CLOSED', 'FORCE_CLOSED', 'CANCELLED'],
    default: 'DRAFT'
  },
  // Visibility
  visibility: {
    type: String,
    enum: ['PUBLIC', 'PRIVATE'],
    default: 'PUBLIC'
  },
  // Relationships
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitedSuppliers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  winnerSupplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Additional fields
  estimatedValue: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  }
}, {
  timestamps: true
});

// Indexes for performance
rfqSchema.index({ status: 1 });
rfqSchema.index({ currentCloseTime: 1 });
rfqSchema.index({ createdBy: 1 });
rfqSchema.index({ referenceId: 1 });

module.exports = mongoose.model('RFQ', rfqSchema);
