const connectToDatabase = require('../lib/db');
const RFQ = require('../lib/models/RFQ');
const Bid = require('../lib/models/Bid');
const { RFQ_STATUS } = require('../lib/constants/auctionConstants');
const { getAuctionStatus } = require('../lib/utils/auctionStatus');

// Generate unique reference ID
const generateReferenceId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RFQ-${timestamp}-${random}`;
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
    const User = require('../lib/models/User');
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (req.method === 'POST') {
      // Create RFQ - only buyer and admin
      if (user.role !== 'buyer' && user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const {
        rfqName,
        description,
        serviceType,
        pickupLocation,
        deliveryLocation,
        pickupDate,
        bidStartTime,
        originalCloseTime,
        forcedCloseTime,
        triggerWindowMinutes,
        extensionDurationMinutes,
        triggerType,
        auctionEnabled,
        invitedSuppliers,
        estimatedValue,
        visibility
      } = req.body;

      // Validation: bidStartTime < originalCloseTime
      if (new Date(bidStartTime) >= new Date(originalCloseTime)) {
        return res.status(400).json({
          success: false,
          message: 'Bid start time must be before bid close time'
        });
      }

      // Validation: originalCloseTime < forcedCloseTime
      if (forcedCloseTime && new Date(originalCloseTime) >= new Date(forcedCloseTime)) {
        return res.status(400).json({
          success: false,
          message: 'Bid close time must be before forced close time'
        });
      }

      const rfq = await RFQ.create({
        rfqName,
        referenceId: generateReferenceId(),
        description,
        serviceType,
        pickupLocation,
        deliveryLocation,
        pickupDate,
        bidStartTime,
        originalCloseTime,
        currentCloseTime: originalCloseTime,
        forcedCloseTime,
        triggerWindowMinutes,
        extensionDurationMinutes,
        triggerType,
        auctionEnabled,
        status: RFQ_STATUS.DRAFT,
        visibility: visibility || 'PUBLIC',
        createdBy: user._id,
        invitedSuppliers: invitedSuppliers || [],
        estimatedValue
      });

      // Log RFQ creation
      const ActivityLog = require('../lib/models/ActivityLog');
      await ActivityLog.create({
        rfqId: rfq._id,
        actorId: user._id,
        actorRole: user.role,
        actionType: 'RFQ_CREATED',
        message: `RFQ created: ${rfq.referenceId}`,
        metadata: {
          rfqName,
          visibility: rfq.visibility
        }
      });

      res.status(201).json({
        success: true,
        message: 'RFQ created successfully',
        data: { rfq }
      });

    } else if (req.method === 'GET') {
      // Get All RFQs (role-based with dynamic status)
      const { status } = req.query;
      let filter = {};

      // Role-based filtering
      if (user.role === 'buyer') {
        filter.createdBy = user._id;
      } else if (user.role === 'supplier') {
        filter.$or = [
          { visibility: 'PUBLIC' },
          { invitedSuppliers: user._id }
        ];
      }
      // Admin can see all RFQs (no filter)

      const rfqs = await RFQ.find(filter)
        .populate('createdBy', 'name email companyName')
        .populate('invitedSuppliers', 'name email companyName')
        .populate('winnerSupplier', 'name email companyName')
        .sort({ createdAt: -1 });

      // Calculate dynamic status for each RFQ
      const rfqsWithStatus = rfqs.map(rfq => {
        const rfqObj = rfq.toObject();
        rfqObj.status = getAuctionStatus(rfqObj);
        rfqObj._id = rfq._id.toString();
        return rfqObj;
      });

      // Apply status filter if provided (after dynamic calculation)
      let filteredRFQs = rfqsWithStatus;
      if (status) {
        filteredRFQs = rfqsWithStatus.filter(rfq => rfq.status === status);
      }

      res.status(200).json({
        success: true,
        data: { rfqs: filteredRFQs }
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
