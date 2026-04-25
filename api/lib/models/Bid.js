const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  rfqId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFQ',
    required: [true, 'RFQ ID is required'],
    index: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Supplier ID is required'],
    index: true
  },
  // Quote Details
  carrierName: {
    type: String,
    trim: true
  },
  freightCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  originCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  destinationCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  taxes: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: 0
  },
  // Additional Information
  transitTime: {
    type: Number,
    min: 0
  },
  quoteValidity: {
    type: Date
  },
  remarks: {
    type: String,
    trim: true
  },
  // Ranking Information
  rankAtSubmission: {
    type: Number
  },
  isRejected: {
    type: Boolean,
    default: false
  },
  rejectionReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index for faster queries
bidSchema.index({ rfqId: 1, totalAmount: 1 });
bidSchema.index({ supplierId: 1 });
bidSchema.index({ rfqId: 1, supplierId: 1 });

module.exports = mongoose.model('Bid', bidSchema);
