const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// GET /api/messages — get recent messages
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(50);
    res.json({ success: true, messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/messages — save a message
router.post('/', async (req, res) => {
  try {
    const { senderId, senderName, content, contentType, room } = req.body;
    const message = await Message.create({ senderId, senderName, content, contentType, room });
    res.status(201).json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
