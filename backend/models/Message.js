const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  senderName: String,
  content: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    enum: ['text', 'voice-transcribed', 'gesture-translated'],
    default: 'text'
  },
  room: {
    type: String,
    default: 'general'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);
