const Bid = require('../models/Bid');
const RFQ = require('../models/RFQ');
const ActivityLog = require('../models/ActivityLog');
const { RFQ_STATUS, TRIGGER_TYPE, ACTION_TYPE } = require('../constants/auctionConstants');
const { emitBidEvent, emitDashboardUpdate } = require('../config/socket');
const { getAuctionStatus } = require('../utils/auctionStatus');

// Auction Engine - Core Logic
const auctionEngine = async (rfqId, supplierId, bidData, io) => {
  const rfq = await RFQ.findById(rfqId);
  if (!rfq) {
    throw new Error('RFQ not found');
  }

  const now = new Date();

  // Validation 1: Auction must be enabled
  if (!rfq.auctionEnabled) {
    throw new Error('Auction is not enabled for this RFQ');
  }

  // Validation 2: Check if auction is active using central status function
  const currentStatus = getAuctionStatus(rfq, now);
  if (currentStatus === RFQ_STATUS.UPCOMING) {
    throw new Error('Auction has not started yet');
  }
  if (currentStatus === RFQ_STATUS.CLOSED || currentStatus === RFQ_STATUS.FORCE_CLOSED) {
    throw new Error('Auction has closed');
  }
  if (currentStatus === RFQ_STATUS.CANCELLED) {
    throw new Error('Auction has been cancelled');
  }

  // Validation 3: Check bid timing (redundant but kept for clarity)
  if (now < new Date(rfq.bidStartTime)) {
    throw new Error('Auction has not started yet');
  }

  if (now > new Date(rfq.currentCloseTime)) {
    throw new Error('Auction has closed');
  }

  if (rfq.forcedCloseTime && now > new Date(rfq.forcedCloseTime)) {
    throw new Error('Auction has passed forced close time');
  }

  // Validation 4: Check if supplier is invited or RFQ is PUBLIC
  const isInvited = rfq.invitedSuppliers.some(s => s._id.toString() === supplierId.toString());
  const isPublic = rfq.visibility === 'PUBLIC';
  if (!isInvited && !isPublic) {
    throw new Error('You are not invited to this auction');
  }

  // Validation 5: Check if new bid is lower than previous bid
  const previousBid = await Bid.findOne({
    rfqId,
    supplierId
  }).sort({ createdAt: -1 });

  if (previousBid && bidData.totalAmount >= previousBid.totalAmount) {
    throw new Error('New bid must be lower than your previous bid');
  }

  // Validation 6: Calculate total amount
  const totalAmount = (
    (bidData.freightCharges || 0) +
    (bidData.originCharges || 0) +
    (bidData.destinationCharges || 0) +
    (bidData.taxes || 0) -
    (bidData.discount || 0)
  );

  // Get old ranking before bid
  const oldRanking = await calculateRanking(rfqId);

  // Save the bid
  const bid = await Bid.create({
    rfqId,
    supplierId,
    ...bidData,
    totalAmount
  });

  // Get new ranking after bid
  const newRanking = await calculateRanking(rfqId);

  // Detect rank changes
  const rankChange = detectRankChange(oldRanking, newRanking, supplierId);
  const l1Change = detectL1Change(oldRanking, newRanking);

  // Check if bid is in trigger window
  const triggerWindowEnd = new Date(rfq.currentCloseTime.getTime() - (rfq.triggerWindowMinutes * 60 * 1000));
  const isInTriggerWindow = now >= triggerWindowEnd;

  // Apply extension based on trigger type
  let extensionApplied = false;
  if (isInTriggerWindow && rfq.auctionEnabled) {
    let shouldExtend = false;

    switch (rfq.triggerType) {
      case TRIGGER_TYPE.BID_RECEIVED:
        shouldExtend = true;
        break;
      case TRIGGER_TYPE.ANY_RANK_CHANGE:
        shouldExtend = rankChange.changed;
        break;
      case TRIGGER_TYPE.L1_CHANGE:
        shouldExtend = l1Change.changed;
        break;
    }

    if (shouldExtend) {
      const newCloseTime = new Date(rfq.currentCloseTime.getTime() + (rfq.extensionDurationMinutes * 60 * 1000));
      
      // Never extend beyond forced close time
      if (!rfq.forcedCloseTime || newCloseTime <= new Date(rfq.forcedCloseTime)) {
        rfq.currentCloseTime = newCloseTime;
        rfq.extensionCount += 1;
        extensionApplied = true;
      }
    }
  }

  await rfq.save();

  // Log activity
  await ActivityLog.create({
    rfqId,
    actorId: supplierId,
    actorRole: 'supplier',
    actionType: ACTION_TYPE.BID_SUBMITTED,
    message: `Bid submitted: $${totalAmount.toFixed(2)}`,
    metadata: {
      bidId: bid._id,
      totalAmount,
      rank: newRanking.find(r => r.supplierId.toString() === supplierId)?.rank,
      extensionApplied
    }
  });

  // Emit real-time events if io is provided
  if (io) {
    // Emit bid submitted event to all users watching this RFQ
    emitBidEvent(io, rfqId, 'bid_submitted', {
      bidId: bid._id,
      rfqId,
      supplierId,
      totalAmount,
      ranking: newRanking,
      extensionApplied,
      newCloseTime: rfq.currentCloseTime
    });

    // Emit dashboard update to the buyer
    emitDashboardUpdate(io, rfq.createdBy.toString(), {
      type: 'new_bid',
      rfqId,
      totalAmount
    });

    // Emit dashboard update to the supplier
    emitDashboardUpdate(io, supplierId.toString(), {
      type: 'bid_submitted',
      rfqId,
      totalAmount,
      rank: newRanking.find(r => r.supplierId.toString() === supplierId)?.rank
    });
  }

  if (extensionApplied) {
    await ActivityLog.create({
      rfqId,
      actorId: supplierId,
      actorRole: 'supplier',
      actionType: ACTION_TYPE.AUCTION_EXTENDED,
      message: `Auction extended by ${rfq.extensionDurationMinutes} minutes`,
      metadata: {
        newCloseTime: rfq.currentCloseTime,
        extensionCount: rfq.extensionCount
      }
    });
  }

  if (l1Change.changed) {
    await ActivityLog.create({
      rfqId,
      actorId: supplierId,
      actorRole: 'supplier',
      actionType: ACTION_TYPE.L1_CHANGED,
      message: `L1 changed to ${l1Change.newL1?.supplierName || 'Unknown'}`,
      metadata: {
        oldL1: l1Change.oldL1,
        newL1: l1Change.newL1
      }
    });
  }

  return {
    bid,
    ranking: newRanking,
    extensionApplied,
    newCloseTime: rfq.currentCloseTime
  };
};

// Ranking Engine
const calculateRanking = async (rfqId) => {
  console.log('[RANKING] Calculating rankings for RFQ:', rfqId);

  // Convert rfqId to ObjectId for MongoDB queries
  const mongoose = require('mongoose');
  const rfqObjectId = new mongoose.Types.ObjectId(rfqId);

  // First, check total bids for this RFQ
  const totalBids = await Bid.countDocuments({ rfqId: rfqObjectId });
  console.log('[RANKING] Total bids found:', totalBids);

  const bids = await Bid.aggregate([
    { $match: { rfqId: rfqObjectId, isRejected: false } },
    {
      $group: {
        _id: '$supplierId',
        lowestAmount: { $min: '$totalAmount' },
        firstBidTime: { $min: '$createdAt' }
      }
    },
    {
      $sort: { lowestAmount: 1, firstBidTime: 1 }
    }
  ]);

  console.log('[RANKING] Aggregated ranking result:', JSON.stringify(bids, null, 2));

  const ranking = bids.map((bid, index) => ({
    supplierId: bid._id,
    rank: index + 1,
    lowestAmount: bid.lowestAmount,
    firstBidTime: bid.firstBidTime
  }));

  console.log('[RANKING] Final ranking:', JSON.stringify(ranking, null, 2));

  return ranking;
};

// Detect rank change
const detectRankChange = (oldRanking, newRanking, supplierId) => {
  const oldRank = oldRanking.find(r => r.supplierId.toString() === supplierId)?.rank;
  const newRank = newRanking.find(r => r.supplierId.toString() === supplierId)?.rank;

  return {
    changed: oldRank !== newRank,
    oldRank,
    newRank
  };
};

// Detect L1 change
const detectL1Change = (oldRanking, newRanking) => {
  const oldL1 = oldRanking[0];
  const newL1 = newRanking[0];

  return {
    changed: oldL1?.supplierId?.toString() !== newL1?.supplierId?.toString(),
    oldL1,
    newL1
  };
};

// Submit Bid
const submitBid = async (req, res) => {
  try {
    // Authorization: Only suppliers can submit bids
    if (req.user.role !== 'supplier') {
      return res.status(403).json({
        success: false,
        message: 'Only suppliers can submit bids'
      });
    }

    const { rfqId } = req.params;
    const supplierId = req.user._id;
    const bidData = req.body;
    const io = req.app.get('io');

    // Prevent RFQ creator from bidding on own auction
    const rfq = await RFQ.findById(rfqId);
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    if (rfq.createdBy.toString() === supplierId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'RFQ creator cannot bid on own auction'
      });
    }

    const result = await auctionEngine(rfqId, supplierId, bidData, io);

    res.status(201).json({
      success: true,
      message: 'Bid submitted successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error submitting bid'
    });
  }
};

// Get Bids for RFQ
const getBidsForRFQ = async (req, res) => {
  try {
    const { rfqId } = req.params;
    const user = req.user;

    const rfq = await RFQ.findById(rfqId);
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    // Access control
    if (user.role === 'supplier') {
      const isInvited = rfq.invitedSuppliers.some(s => s._id.toString() === user._id.toString());
      const isPublic = rfq.visibility === 'PUBLIC';
      if (!isInvited && !isPublic) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const bids = await Bid.find({ rfqId, isRejected: false })
      .populate('supplierId', 'name email companyName')
      .sort({ totalAmount: 1, createdAt: 1 });

    const ranking = await calculateRanking(rfqId);

    res.status(200).json({
      success: true,
      data: { bids, ranking }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching bids'
    });
  }
};

// Get Rankings for RFQ
const getRankings = async (req, res) => {
  try {
    const { rfqId } = req.params;
    const user = req.user;

    console.log('[RANKINGS API] Request received for RFQ:', rfqId, 'by user:', user.role, user.email);

    const rfq = await RFQ.findById(rfqId);
    if (!rfq) {
      console.log('[RANKINGS API] RFQ not found:', rfqId);
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    console.log('[RANKINGS API] RFQ found:', rfq.referenceId, 'status:', rfq.status);

    // Access control
    if (user.role === 'supplier') {
      const isInvited = rfq.invitedSuppliers.some(s => s._id.toString() === user._id.toString());
      const isPublic = rfq.visibility === 'PUBLIC';
      console.log('[RANKINGS API] Supplier access check - isInvited:', isInvited, 'isPublic:', isPublic);
      if (!isInvited && !isPublic) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const ranking = await calculateRanking(rfqId);

    console.log('[RANKINGS API] Ranking calculated, count:', ranking.length);

    // Populate supplier details
    const populatedRanking = await Promise.all(
      ranking.map(async (rank) => {
        const supplier = await require('../models/User').findById(rank.supplierId)
          .select('name email companyName');
        return {
          ...rank,
          supplier
        };
      })
    );

    console.log('[RANKINGS API] Populated ranking count:', populatedRanking.length);
    console.log('[RANKINGS API] Response data:', JSON.stringify({
      success: true,
      data: { ranking: populatedRanking }
    }, null, 2));

    res.status(200).json({
      success: true,
      data: { ranking: populatedRanking }
    });
  } catch (error) {
    console.log('[RANKINGS API] Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching rankings'
    });
  }
};

// Get My Bids
const getMyBids = async (req, res) => {
  try {
    const bids = await Bid.find({ supplierId: req.user._id })
      .populate('rfqId', 'rfqName referenceId status currentCloseTime')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { bids }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching bids'
    });
  }
};

module.exports = {
  submitBid,
  getBidsForRFQ,
  getRankings,
  getMyBids,
  auctionEngine,
  calculateRanking
};
