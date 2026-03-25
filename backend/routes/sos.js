const express = require('express');
const router = express.Router();
const SOS = require('../models/SOS');

// POST /api/sos — trigger SOS alert
router.post('/', async (req, res) => {
  try {
    const { userId, userName, location, triggerMethod, message } = req.body;

    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({ success: false, message: 'Location required for SOS.' });
    }

    const sos = await SOS.create({
      userId,
      userName: userName || 'Anonymous',
      location,
      triggerMethod: triggerMethod || 'button',
      message
    });

    res.status(201).json({
      success: true,
      message: 'SOS alert sent successfully',
      sos
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sos — get all active SOS alerts (admin)
router.get('/', async (req, res) => {
  try {
    const alerts = await SOS.find({ status: 'active' }).sort({ timestamp: -1 });
    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/sos/:id/resolve
router.put('/:id/resolve', async (req, res) => {
  try {
    const sos = await SOS.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved' },
      { new: true }
    );
    res.json({ success: true, sos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
