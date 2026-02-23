const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { sendDistributorCredentials } = require('../utils/email');

// Generate random password
const generatePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// GET /api/distributors - Admin: get all distributors
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const distributors = await User.find({ role: 'distributor' })
      .sort({ createdAt: -1 })
      .select('-password');
    res.json({ distributors });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/distributors - Admin: create distributor
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, company, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const plainPassword = generatePassword();

    const distributor = await User.create({
      name,
      email: email.toLowerCase(),
      password: plainPassword,
      role: 'distributor',
      company,
      phone
    });

    // Send credentials via email
    try {
      await sendDistributorCredentials({ name, email, password: plainPassword });
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
      // Don't fail the request if email fails — return credentials in response
      return res.status(201).json({
        distributor,
        tempPassword: plainPassword,
        emailSent: false,
        warning: 'Account created but email could not be sent. Share credentials manually.'
      });
    }

    res.status(201).json({
      distributor,
      emailSent: true,
      message: 'Distributor account created and credentials sent via email'
    });
  } catch (error) {
    console.error('Create distributor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/distributors/:id - Admin: get single distributor
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const distributor = await User.findOne({ _id: req.params.id, role: 'distributor' });
    if (!distributor) {
      return res.status(404).json({ message: 'Distributor not found' });
    }
    res.json({ distributor });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/distributors/:id - Admin: update distributor
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, company, phone, isActive } = req.body;
    const distributor = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'distributor' },
      { name, company, phone, isActive },
      { new: true }
    );
    if (!distributor) {
      return res.status(404).json({ message: 'Distributor not found' });
    }
    res.json({ distributor, message: 'Distributor updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/distributors/:id - Admin: delete distributor
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const distributor = await User.findOneAndDelete({ _id: req.params.id, role: 'distributor' });
    if (!distributor) {
      return res.status(404).json({ message: 'Distributor not found' });
    }
    res.json({ message: 'Distributor deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/distributors/:id/reset-password - Admin: reset password
router.post('/:id/reset-password', protect, adminOnly, async (req, res) => {
  try {
    const distributor = await User.findOne({ _id: req.params.id, role: 'distributor' });
    if (!distributor) {
      return res.status(404).json({ message: 'Distributor not found' });
    }

    const newPassword = generatePassword();
    distributor.password = newPassword;
    await distributor.save();

    try {
      await sendDistributorCredentials({
        name: distributor.name,
        email: distributor.email,
        password: newPassword
      });
      res.json({ message: 'Password reset and sent via email', emailSent: true });
    } catch (emailError) {
      res.json({ message: 'Password reset', tempPassword: newPassword, emailSent: false });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
