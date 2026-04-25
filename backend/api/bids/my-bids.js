const connectToDatabase = require('../lib/db');
const Bid = require('../lib/models/Bid');

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

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // BUG FIX #6: Add null checks for populated fields
    const bids = await Bid.find({ supplierId: user._id })
      .populate('rfqId', 'rfqName referenceId status currentCloseTime')
      .sort({ createdAt: -1 });

    // Filter out bids where rfqId population failed
    const validBids = bids.filter(bid => bid.rfqId);

    res.status(200).json({
      success: true,
      data: { bids: validBids }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing request'
    });
  }
};
