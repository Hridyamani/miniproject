const mongoose = require('mongoose');

const outgoingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: String,
  roomNumber: String,
  date: {
    type: Date,
    default: Date.now
  },
  timeLeaving: String,
  place: String,
  status: {
    type: String,
    enum: ['active', 'returned'],
    default: 'active'
  },
  returnTime: String,
  returnDate: Date,
  isReturned: {
    type: Boolean,
    default: false
  },
  gpsLocation: {
    lat: Number,
    lng: Number
  },
  isGpsVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

outgoingSchema.index({ student: 1, status: 1 });

module.exports = mongoose.model('Outgoing', outgoingSchema);
