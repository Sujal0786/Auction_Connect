const express = require('express');
const router = express.Router();
const { register, login, getMe, getSuppliers } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', authMiddleware, getMe);
router.get('/suppliers', authMiddleware, getSuppliers);

module.exports = router;
