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

    const { id } = req.query;

    if (req.method === 'GET') {
      const rfq = await RFQ.findById(id)
        .populate('createdBy', 'name email companyName')
        .populate('invitedSuppliers', 'name email companyName')
        .populate('winnerSupplier', 'name email companyName');

      if (!rfq) {
        return res.status(404).json({
          success: false,
          message: 'RFQ not found'
        });
      }

      // Role-based access check
      if (user.role === 'buyer' && rfq.createdBy._id.toString() !== user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

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

      // Get bid count and supplier count
      const bidCount = await Bid.countDocuments({ rfqId: rfq._id });
      const supplierCount = await Bid.distinct('supplierId', { rfqId: rfq._id }).then(ids => ids.length);

      // Calculate dynamic status
      const rfqObj = rfq.toObject();
      rfqObj.status = getAuctionStatus(rfqObj);
      rfqObj.bidCount = bidCount;
      rfqObj.supplierCount = supplierCount;

      res.status(200).json({
        success: true,
        data: { rfq: rfqObj }
      });

    } else if (req.method === 'PUT') {
      // Update RFQ - only buyer who created it
      const updates = req.body;

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

      // BUG FIX #1: Use dynamic status instead of static
      const currentStatus = getAuctionStatus(rfq);
      if (currentStatus === RFQ_STATUS.ACTIVE || currentStatus === RFQ_STATUS.CLOSED || currentStatus === RFQ_STATUS.FORCE_CLOSED) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update RFQ in current status'
        });
      }

      Object.assign(rfq, updates);
      await rfq.save();

      res.status(200).json({
        success: true,
        message: 'RFQ updated successfully',
        data: { rfq }
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
