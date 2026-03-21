const mongoose = require('mongoose');

const homeGoingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: String,
  roomNumber: String,
  leaveDate: {
    type: Date,
    required: true
  },
  time: { type: String, required: true },
  place: { type: String, required: true },
  reason: { type: String, required: false }, // optional for recording, required for request
  cancelReason: { type: String, required: false },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'returned', 'cancelled'],
    default: 'pending'
  },
  isReturned: {
    type: Boolean,
    default: false
  },
  returnDate: Date,
  returnTime: String,
  recordingType: {
    type: String,
    enum: ['request', 'recording'],
    default: 'request'
  }
}, {
  timestamps: true
});

homeGoingSchema.index({ student: 1, status: 1 });
module.exports = mongoose.model('HomeGoing', homeGoingSchema);
