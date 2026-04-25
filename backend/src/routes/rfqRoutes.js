const express = require('express');
const router = express.Router();
const {
  createRFQ,
  getAllRFQs,
  getRFQById,
  updateRFQ,
  cancelRFQ,
  selectWinner,
  getMyInvitedRFQs
} = require('../controllers/rfqController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Buyer and Admin routes
router.post('/', roleMiddleware('buyer', 'admin'), createRFQ);
router.get('/', getAllRFQs);
router.get('/my-rfqs', roleMiddleware('supplier'), getMyInvitedRFQs);
router.get('/:id', getRFQById);
router.put('/:id', roleMiddleware('buyer', 'admin'), updateRFQ);
router.patch('/:id/cancel', roleMiddleware('buyer', 'admin'), cancelRFQ);
router.patch('/:id/select-winner', roleMiddleware('buyer', 'admin'), selectWinner);

module.exports = router;
