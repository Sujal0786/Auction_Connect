const connectToDatabase = require('../lib/db');
const RFQ = require('../lib/models/RFQ');
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

    if (req.method !== 'PATCH') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { id } = req.query;
    const { winnerSupplierId } = req.body;

    const rfq = await RFQ.findById(id);
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    if (rfq.createdBy.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // BUG FIX #3: Use dynamic status instead of static
    const currentStatus = getAuctionStatus(rfq);
    if (currentStatus !== RFQ_STATUS.CLOSED && currentStatus !== RFQ_STATUS.FORCE_CLOSED) {
      return res.status(400).json({
        success: false,
        message: 'Can only select winner for closed auctions'
      });
    }

    rfq.winnerSupplier = winnerSupplierId;
    await rfq.save();

    res.status(200).json({
      success: true,
      message: 'Winner selected successfully',
      data: { rfq }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing request'
    });
  }
};
