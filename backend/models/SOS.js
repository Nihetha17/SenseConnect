const mongoose = require('mongoose');

const sosSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // allow anonymous SOS
  },
  userName: String,
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: Number,
    address: String
  },
  triggerMethod: {
    type: String,
    enum: ['button', 'voice', 'gesture'],
    default: 'button'
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'cancelled'],
    default: 'active'
  },
  message: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SOS', sosSchema);
