const RFQ = require('../models/RFQ');
const Bid = require('../models/Bid');
const { RFQ_STATUS } = require('../constants/auctionConstants');
const { getAuctionStatus } = require('../utils/auctionStatus');

// Generate unique reference ID
const generateReferenceId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RFQ-${timestamp}-${random}`;
};

// Create RFQ
const createRFQ = async (req, res) => {
  try {
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
      createdBy: req.user._id,
      invitedSuppliers: invitedSuppliers || [],
      estimatedValue
    });

    // Log RFQ creation
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      rfqId: rfq._id,
      actorId: req.user._id,
      actorRole: req.user.role,
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating RFQ'
    });
  }
};

// Get All RFQs (role-based with dynamic status)
const getAllRFQs = async (req, res) => {
  try {
    const { status } = req.query;
    const user = req.user;
    let filter = {};

    // Role-based filtering
    if (user.role === 'buyer') {
      filter.createdBy = user._id;
    } else if (user.role === 'supplier') {
      // Suppliers see PUBLIC RFQs or RFQs they are invited to
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

    // Calculate dynamic status for each RFQ and get lowest bid
    const rfqsWithStatus = await Promise.all(rfqs.map(async (rfq) => {
      const rfqObj = rfq.toObject();
      rfqObj.status = getAuctionStatus(rfqObj);
      // Ensure _id is included as a string
      rfqObj._id = rfq._id.toString();

      // Get lowest bid for this RFQ
      const lowestBid = await Bid.findOne({ rfqId: rfq._id, isRejected: false })
        .sort({ totalAmount: 1 });
      rfqObj.lowestBid = lowestBid ? lowestBid.totalAmount : null;

      return rfqObj;
    }));

    // Apply status filter if provided (after dynamic calculation)
    let filteredRFQs = rfqsWithStatus;
    if (status) {
      filteredRFQs = rfqsWithStatus.filter(rfq => rfq.status === status);
    }

    res.status(200).json({
      success: true,
      data: { rfqs: filteredRFQs }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching RFQs'
    });
  }
};

// Get Single RFQ
const getRFQById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

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

    // Admin has explicit access to all RFQs
    if (user.role === 'admin') {
      // Admin can access any RFQ
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching RFQ'
    });
  }
};

// Update RFQ
const updateRFQ = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const rfq = await RFQ.findById(id);

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    // Only buyer who created the RFQ can update it
    if (rfq.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Cannot update if auction is active or closed (use dynamic status)
    const currentStatus = getAuctionStatus(rfq.toObject());
    if (currentStatus === RFQ_STATUS.ACTIVE || currentStatus === RFQ_STATUS.CLOSED) {
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating RFQ'
    });
  }
};

// Cancel RFQ
const cancelRFQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const rfq = await RFQ.findById(id);

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    if (rfq.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Cannot cancel if already closed or cancelled (use dynamic status)
    const currentStatus = getAuctionStatus(rfq.toObject());
    if (currentStatus === RFQ_STATUS.CLOSED || currentStatus === RFQ_STATUS.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel RFQ in current status'
      });
    }

    rfq.status = RFQ_STATUS.CANCELLED;
    await rfq.save();

    res.status(200).json({
      success: true,
      message: 'RFQ cancelled successfully',
      data: { rfq }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error cancelling RFQ'
    });
  }
};

// Select Winner
const selectWinner = async (req, res) => {
  try {
    const { id } = req.params;
    const { winnerSupplierId } = req.body;

    const rfq = await RFQ.findById(id);

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    if (rfq.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Can only select winner for closed auctions (use dynamic status)
    const currentStatus = getAuctionStatus(rfq.toObject());
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
      message: error.message || 'Error selecting winner'
    });
  }
};

// Get RFQs where supplier is invited
const getMyInvitedRFQs = async (req, res) => {
  try {
    const rfqs = await RFQ.find({
      $or: [
        { invitedSuppliers: req.user._id },
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
      // Ensure _id is included as a string
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
      message: error.message || 'Error fetching invited RFQs'
    });
  }
};

module.exports = {
  createRFQ,
  getAllRFQs,
  getRFQById,
  updateRFQ,
  cancelRFQ,
  selectWinner,
  getMyInvitedRFQs
};
