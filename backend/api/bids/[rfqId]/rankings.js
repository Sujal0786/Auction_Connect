const connectToDatabase = require('../../lib/db');
const RFQ = require('../../lib/models/RFQ');
const Bid = require('../../lib/models/Bid');

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

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { rfqId } = req.query;

    const rfq = await RFQ.findById(rfqId);
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    // BUG FIX #12: Explicit admin access control
    if (user.role === 'admin') {
      // Admin can view all rankings
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

    const ranking = await calculateRanking(rfqId);

    // Populate supplier details
    const populatedRanking = await Promise.all(
      ranking.map(async (rank) => {
        const supplier = await User.findById(rank.supplierId)
          .select('name email companyName');
        return {
          ...rank,
          supplier
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { ranking: populatedRanking }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing request'
    });
  }
};
