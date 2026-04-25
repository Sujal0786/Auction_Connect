const express = require('express');
const router = express.Router();
const {
  submitBid,
  getBidsForRFQ,
  getRankings,
  getMyBids
} = require('../controllers/bidController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Supplier routes
router.post('/:rfqId/bids', roleMiddleware('supplier'), submitBid);
router.get('/my-bids', roleMiddleware('supplier'), getMyBids);

// All authenticated users can view bids and rankings
router.get('/:rfqId/bids', getBidsForRFQ);
router.get('/:rfqId/rankings', getRankings);

module.exports = router;
