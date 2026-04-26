const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const RFQ = require('../models/RFQ');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get activity logs for an RFQ
router.get('/:rfqId/logs', async (req, res) => {
  try {
    const { rfqId } = req.params;
    const user = req.user;

    // Check if user has access to the RFQ
    const rfq = await RFQ.findById(rfqId)
      .populate('createdBy', 'name email')
      .populate('invitedSuppliers', 'name email');

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

    const logs = await ActivityLog.find({ rfqId })
      .populate('actorId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: { logs }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching activity logs'
    });
  }
});

module.exports = router;
