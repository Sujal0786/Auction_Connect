const express = require('express');
const router = express.Router();
const {
  getBuyerDashboard,
  getSupplierDashboard,
  getAdminDashboard
} = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Role-based dashboard routes
router.get('/buyer', roleMiddleware('buyer', 'admin'), getBuyerDashboard);
router.get('/supplier', roleMiddleware('supplier', 'admin'), getSupplierDashboard);
router.get('/admin', roleMiddleware('admin'), getAdminDashboard);

module.exports = router;
