const connectToDatabase = require('../lib/db');
const RFQ = require('../lib/models/RFQ');
const Bid = require('../lib/models/Bid');
const User = require('../lib/models/User');
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
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const totalRFQs = await RFQ.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalBids = await Bid.countDocuments();

    // Get all RFQs to calculate dynamic status
    const rfqs = await RFQ.find();
    const rfqsWithStatus = rfqs.map(rfq => {
      const rfqObj = rfq.toObject();
      rfqObj.status = getAuctionStatus(rfqObj);
      return rfqObj;
    });

    // Count active auctions by dynamic status
    const activeAuctions = rfqsWithStatus.filter(r => r.status === RFQ_STATUS.ACTIVE).length;

    // Group by dynamic status
    const rfqsByStatus = rfqsWithStatus.reduce((acc, rfq) => {
      acc[rfq.status] = (acc[rfq.status] || 0) + 1;
      return acc;
    }, {});

    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalRFQs,
          activeAuctions,
          totalUsers,
          totalBids
        },
        rfqsByStatus,
        usersByRole
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing request'
    });
  }
};
