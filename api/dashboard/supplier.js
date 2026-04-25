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

    if (user.role !== 'supplier' && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const supplierId = user._id;

    // Get all bids by this supplier
    const myBids = await Bid.find({ supplierId })
      .populate('rfqId', 'rfqName referenceId')
      .populate('supplierId', 'name companyName')
      .sort({ createdAt: -1 });

    // BUG FIX #6: Add null checks for populated fields
    const validBids = myBids.filter(bid => bid.rfqId);
    const rfqIds = [...new Set(validBids.map(bid => bid.rfqId._id.toString()))];

    // Calculate statistics
    const totalBids = validBids.length;
    const totalRFQs = rfqIds.length;
    const avgBidAmount = totalBids > 0 
      ? validBids.reduce((sum, bid) => sum + bid.totalAmount, 0) / totalBids 
      : 0;

    // Calculate L1 positions
    let l1Count = 0;
    
    for (const rfqId of rfqIds) {
      const lowestBid = await Bid.findOne({ 
        rfqId,
        isRejected: false 
      }).sort({ totalAmount: 1 });
      
      if (lowestBid && lowestBid.supplierId.toString() === supplierId.toString()) {
        l1Count++;
      }
    }

    // Get available auctions
    const availableRFQs = await RFQ.find({
      $or: [
        { visibility: 'PUBLIC' },
        { invitedSuppliers: supplierId }
      ]
    });

    const rfqsWithStatus = availableRFQs.map(rfq => {
      const rfqObj = rfq.toObject();
      rfqObj.status = getAuctionStatus(rfqObj);
      return rfqObj;
    });

    const availableAuctions = rfqsWithStatus.filter(r => 
      r.status === RFQ_STATUS.UPCOMING || r.status === RFQ_STATUS.ACTIVE
    ).length;

    // Participated auctions
    const participatedAuctions = totalRFQs;

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalRFQs,
          totalBids,
          l1Count,
          avgBidAmount,
          availableAuctions,
          participatedAuctions
        },
        myBids: validBids.slice(0, 10)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing request'
    });
  }
};
