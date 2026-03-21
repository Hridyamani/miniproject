const mongoose = require('mongoose');

const hostelClosedDaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reason: {
    type: String,
    default: 'Holiday'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('HostelClosedDay', hostelClosedDaySchema);
