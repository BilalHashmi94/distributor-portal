const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { default: mongoose } = require('mongoose');

const generateToken = (id) => {
  return jwt.sign({ id }, '7f3k9mXpQ2sLvNwRbYcTdAeHgUjZoKiPqFnDmCxWsSyErVtBuGhIlOa4e8r1z6', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  mongoose
      .connect(
        process.env.MONGODB_URI || "mongodb+srv://muhammedbilalhashmi94_db_user:114QlQ9BwRoM1wdg@cluster0.6rij7pu.mongodb.net/",
      )
      .then(() => {
        console.log("✅ Connected to MongoDB");
        // Create default admin if none exists
        // seedAdmin();
      })
      .catch((err) => console.error("❌ MongoDB connection error:", err));
  try {
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated. Contact admin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        phone: user.phone,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  mongoose
      .connect(
        process.env.MONGODB_URI || "mongodb+srv://muhammedbilalhashmi94_db_user:114QlQ9BwRoM1wdg@cluster0.6rij7pu.mongodb.net/",
      )
      .then(() => {
        console.log("✅ Connected to MongoDB");
        // Create default admin if none exists
        // seedAdmin();
      })
      .catch((err) => console.error("❌ MongoDB connection error:", err));
  res.json({ user: req.user });
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  mongoose
      .connect(
        process.env.MONGODB_URI || "mongodb+srv://muhammedbilalhashmi94_db_user:114QlQ9BwRoM1wdg@cluster0.6rij7pu.mongodb.net/",
      )
      .then(() => {
        console.log("✅ Connected to MongoDB");
        // Create default admin if none exists
        // seedAdmin();
      })
      .catch((err) => console.error("❌ MongoDB connection error:", err));
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
