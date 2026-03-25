const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Helper: generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, abilities, emergencyContacts } = req.body;

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    // Determine preferred mode from abilities
    const { canSee = true, canHear = true, canSpeak = true } = abilities || {};
    let preferredMode = 'hybrid';
    if (!canSee && !canHear) preferredMode = 'tactile';
    else if (!canSee) preferredMode = 'voice';
    else if (!canHear) preferredMode = 'visual';
    else if (!canSpeak) preferredMode = 'visual';

    const user = await User.create({
      name,
      email,
      password,
      phone,
      abilities: { canSee, canHear, canSpeak },
      emergencyContacts: emergencyContacts || [],
      preferredMode
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        abilities: user.abilities,
        preferredMode: user.preferredMode
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        abilities: user.abilities,
        preferredMode: user.preferredMode,
        emergencyContacts: user.emergencyContacts
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me — get current user
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/abilities — update abilities
router.put('/abilities', protect, async (req, res) => {
  try {
    const { canSee, canHear, canSpeak } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { abilities: { canSee, canHear, canSpeak } },
      { new: true }
    ).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
