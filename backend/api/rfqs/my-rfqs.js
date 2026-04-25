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

    if (user.role !== 'supplier') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const rfqs = await RFQ.find({
      $or: [
        { invitedSuppliers: user._id },
        { visibility: 'PUBLIC' }
      ]
    })
    .populate('createdBy', 'name email companyName')
    .populate('winnerSupplier', 'name email companyName')
    .sort({ createdAt: -1 });

    // Calculate dynamic status for each RFQ
    const rfqsWithStatus = rfqs.map(rfq => {
      const rfqObj = rfq.toObject();
      rfqObj.status = getAuctionStatus(rfqObj);
      rfqObj._id = rfq._id.toString();
      return rfqObj;
    });

    // Filter to show only non-draft RFQs
    const filteredRFQs = rfqsWithStatus.filter(rfq => rfq.status !== RFQ_STATUS.DRAFT);

    res.status(200).json({
      success: true,
      data: { rfqs: filteredRFQs }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing request'
    });
  }
};
