const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  targetRole: {
    type: String,
    enum: ['all', 'student', 'faculty', 'authority', 'admin'],
    default: null
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['request', 'important', 'general', 'alert'],
    default: 'general'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  pdfUrl: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
