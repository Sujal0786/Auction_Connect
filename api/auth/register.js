const connectToDatabase = require('../lib/db');
const User = require('../lib/models/User');

module.exports = async (req, res) => {
  try {
    await connectToDatabase();

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { name, email, password, role, companyName, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      passwordHash: password,
      role,
      companyName,
      phone
    });

    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
          phone: user.phone
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error registering user'
    });
  }
};
