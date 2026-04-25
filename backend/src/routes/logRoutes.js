const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get activity logs for an RFQ
router.get('/:rfqId/logs', async (req, res) => {
  try {
    const { rfqId } = req.params;
    const user = req.user;

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
