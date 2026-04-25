const connectToDatabase = require('../../lib/db');
const RFQ = require('../../lib/models/RFQ');
const Bid = require('../../lib/models/Bid');
const ActivityLog = require('../../lib/models/ActivityLog');
const { RFQ_STATUS, TRIGGER_TYPE, ACTION_TYPE } = require('../../lib/constants/auctionConstants');
const { getAuctionStatus } = require('../../lib/utils/auctionStatus');

// Ranking Engine
const calculateRanking = async (rfqId) => {
  const mongoose = require('mongoose');
  const rfqObjectId = new mongoose.Types.ObjectId(rfqId);

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

  const ranking = bids.map((bid, index) => ({
    supplierId: bid._id,
    rank: index + 1,
    lowestAmount: bid.lowestAmount,
    firstBidTime: bid.firstBidTime
  }));

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

module.exports = async (req, res) => {
  try {
    await connectToDatabase();

    // Verify JWT token and get user
    const jwt = require('jsonwebtoken');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authentication token, access denied' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('../../lib/models/User');
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const { rfqId } = req.query;

    if (req.method === 'POST') {
      // Authorization: Only suppliers can submit bids
      if (user.role !== 'supplier') {
        return res.status(403).json({
          success: false,
          message: 'Only suppliers can submit bids'
        });
      }

      const supplierId = user._id;
      const bidData = req.body;

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

      const now = new Date();

      // Validation 1: Auction must be enabled
      if (!rfq.auctionEnabled) {
        return res.status(400).json({
          success: false,
          message: 'Auction is not enabled for this RFQ'
        });
      }

      // Validation 2: Check if auction is active
      const currentStatus = getAuctionStatus(rfq, now);
      if (currentStatus === RFQ_STATUS.UPCOMING) {
        return res.status(400).json({
          success: false,
          message: 'Auction has not started yet'
        });
      }
      if (currentStatus === RFQ_STATUS.CLOSED || currentStatus === RFQ_STATUS.FORCE_CLOSED) {
        return res.status(400).json({
          success: false,
          message: 'Auction has closed'
        });
      }
      if (currentStatus === RFQ_STATUS.CANCELLED) {
        return res.status(400).json({
          success: false,
          message: 'Auction has been cancelled'
        });
      }

      // Validation 3: Check bid timing
      if (now < new Date(rfq.bidStartTime)) {
        return res.status(400).json({
          success: false,
          message: 'Auction has not started yet'
        });
      }

      if (now > new Date(rfq.currentCloseTime)) {
        return res.status(400).json({
          success: false,
          message: 'Auction has closed'
        });
      }

      if (rfq.forcedCloseTime && now > new Date(rfq.forcedCloseTime)) {
        return res.status(400).json({
          success: false,
          message: 'Auction has passed forced close time'
        });
      }

      // Validation 4: Check if supplier is invited or RFQ is PUBLIC
      const isInvited = rfq.invitedSuppliers.some(s => s._id.toString() === supplierId.toString());
      const isPublic = rfq.visibility === 'PUBLIC';
      if (!isInvited && !isPublic) {
        return res.status(403).json({
          success: false,
          message: 'You are not invited to this auction'
        });
      }

      // Validation 5: Check if new bid is lower than previous bid
      const previousBid = await Bid.findOne({
        rfqId,
        supplierId
      }).sort({ createdAt: -1 });

      if (previousBid && bidData.totalAmount >= previousBid.totalAmount) {
        return res.status(400).json({
          success: false,
          message: 'New bid must be lower than your previous bid'
        });
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
          message: `L1 changed to supplier ID: ${l1Change.newL1?.supplierId || 'Unknown'}`,
          metadata: {
            oldL1: l1Change.oldL1,
            newL1: l1Change.newL1
          }
        });
      }

      res.status(201).json({
        success: true,
        message: 'Bid submitted successfully',
        data: {
          bid,
          ranking: newRanking,
          extensionApplied,
          newCloseTime: rfq.currentCloseTime
        }
      });

    } else if (req.method === 'GET') {
      // Get Bids for RFQ
      const rfq = await RFQ.findById(rfqId);
      if (!rfq) {
        return res.status(404).json({
          success: false,
          message: 'RFQ not found'
        });
      }

      // BUG FIX #12: Explicit admin access control
      if (user.role === 'admin') {
        // Admin can view all bids
      } else if (user.role === 'supplier') {
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
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing request'
    });
  }
};
