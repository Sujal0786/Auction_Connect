const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  rfqId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFQ',
    required: [true, 'RFQ ID is required'],
    index: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Actor ID is required']
  },
  actorRole: {
    type: String,
    enum: ['buyer', 'supplier', 'admin'],
    required: [true, 'Actor role is required']
  },
  actionType: {
    type: String,
    enum: [
      'RFQ_CREATED',
      'RFQ_UPDATED',
      'RFQ_CANCELLED',
      'BID_SUBMITTED',
      'BID_REJECTED',
      'RANK_CHANGED',
      'L1_CHANGED',
      'AUCTION_EXTENDED',
      'AUCTION_CLOSED',
      'AUCTION_FORCE_CLOSED',
      'WINNER_SELECTED'
    ],
    required: [true, 'Action type is required']
  },
  message: {
    type: String,
    required: [true, 'Message is required']
  },
  reason: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for faster queries
activityLogSchema.index({ rfqId: 1, createdAt: -1 });
activityLogSchema.index({ actorId: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
