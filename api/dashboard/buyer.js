const connectToDatabase = require('../lib/db');
const RFQ = require('../lib/models/RFQ');
const Bid = require('../lib/models/Bid');
const { RFQ_STATUS } = require('../lib/constants/auctionConstants');
const { getAuctionStatus } = require('../lib/utils/auctionStatus');

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
    const User = require('../lib/models/User');
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (user.role !== 'buyer' && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const buyerId = user._id;

    // Get all RFQs for this buyer
    const rfqs = await RFQ.find({ createdBy: buyerId })
      .populate('winnerSupplier');

    const rfqIds = rfqs.map(r => r._id);

    // Calculate dynamic status for each RFQ
    const rfqsWithStatus = rfqs.map(rfq => {
      const rfqObj = rfq.toObject();
      rfqObj.status = getAuctionStatus(rfqObj);
      return rfqObj;
    });

    // Count by dynamic status
    const totalRFQs = rfqsWithStatus.length;
    const activeAuctions = rfqsWithStatus.filter(r => r.status === RFQ_STATUS.ACTIVE).length;
    const closedAuctions = rfqsWithStatus.filter(r => 
      r.status === RFQ_STATUS.CLOSED || r.status === RFQ_STATUS.FORCE_CLOSED
    ).length;
    const upcomingAuctions = rfqsWithStatus.filter(r => r.status === RFQ_STATUS.UPCOMING).length;

    // Get all bids for buyer's RFQs
    const allBids = await Bid.find({ rfqId: { $in: rfqIds } })
      .populate('rfqId', 'rfqName referenceId')
      .populate('supplierId', 'name companyName')
      .sort({ createdAt: -1 });

    // Calculate bid statistics
    const totalBids = allBids.length;
    const avgBidAmount = totalBids > 0 
      ? allBids.reduce((sum, bid) => sum + bid.totalAmount, 0) / totalBids 
      : 0;

    // Calculate L1 positions
    let l1Count = 0;
    
    for (const rfqId of rfqIds) {
      const lowestBid = await Bid.findOne({ 
        rfqId,
        isRejected: false 
      }).sort({ totalAmount: 1 });
      
      if (lowestBid) {
        l1Count++;
      }
    }

    // Calculate total savings
    let totalSavings = 0;
    for (const rfq of rfqsWithStatus) {
      if (rfq.estimatedValue && rfq.winnerSupplier && 
          (rfq.status === RFQ_STATUS.CLOSED || rfq.status === RFQ_STATUS.FORCE_CLOSED)) {
        const lowestBid = await Bid.findOne({ 
          rfqId: rfq._id, 
          supplierId: rfq.winnerSupplier._id 
        }).sort({ totalAmount: 1 });
        if (lowestBid) {
          totalSavings += rfq.estimatedValue - lowestBid.totalAmount;
        }
      }
    }

    // Recent activity
    const recentRFQs = rfqsWithStatus
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Recent bids
    const recentBids = allBids.slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalRFQs,
          activeAuctions,
          closedAuctions,
          upcomingAuctions,
          totalSavings,
          totalBids,
          l1Count,
          avgBidAmount
        },
        recentRFQs,
        recentBids
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing request'
    });
  }
};
