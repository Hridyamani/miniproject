const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNo: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  occupants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  block: {
    type: String
  },
  hostel: {
    type: String
  },
  status: {
    type: String,
    enum: ['available', 'full', 'blocked'],
    default: 'available'
  },
  departmentRestriction: {
    type: String // Optional: if room is dedicated to a department
  }
}, {
  timestamps: true
});

// Middleware to update status based on occupancy
roomSchema.pre('save', function (next) {
  if (this.occupants.length >= this.capacity) {
    this.status = 'full';
  } else if (this.status !== 'blocked') {
    this.status = 'available';
  }
  next();
});

module.exports = mongoose.model('Room', roomSchema);
