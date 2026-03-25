const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  phone: {
    type: String,
    trim: true
  },

  // Core capability flags — the heart of the adaptive system
  abilities: {
    canSee:   { type: Boolean, default: true },
    canHear:  { type: Boolean, default: true },
    canSpeak: { type: Boolean, default: true }
  },

  // Emergency contacts for SOS
  emergencyContacts: [
    {
      name: String,
      phone: String,
      relation: String
    }
  ],

  // Preferred interaction mode (auto-detected or manually set)
  preferredMode: {
    type: String,
    enum: ['voice', 'visual', 'tactile', 'hybrid'],
    default: 'hybrid'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
