const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  priority: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'allocated', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Waitlist', waitlistSchema);
