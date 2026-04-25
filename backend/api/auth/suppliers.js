const connectToDatabase = require('../lib/db');
const User = require('../lib/models/User');

module.exports = async (req, res) => {
  try {
    await connectToDatabase();

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // Verify JWT token
    const jwt = require('jsonwebtoken');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authentication token, access denied' 
      });
    }

    const suppliers = await User.find({ role: 'supplier', isActive: true })
      .select('-passwordHash')
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      data: {
        suppliers: suppliers.map(supplier => ({
          id: supplier._id,
          name: supplier.name,
          email: supplier.email,
          companyName: supplier.companyName,
          phone: supplier.phone
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching suppliers'
    });
  }
};
