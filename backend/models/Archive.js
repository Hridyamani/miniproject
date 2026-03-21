const mongoose = require('mongoose');

const ArchiveSchema = new mongoose.Schema({
  originalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  name: String,
  userId: String,
  role: String,
  email: String,
  phone: String,
  department: String,
  roomNumber: String,
  hostelName: String,
  admissionNo: String,
  semester: String,
  guardiansName: String,
  guardiansPhone: String,
  address: String,
  collegeName: String,
  gender: String,
  bloodGroup: String,
  dateOfBirth: Date,
  dateOfAdmission: Date,
  archivedAt: {
    type: Date,
    default: Date.now
  },
  archiveReason: {
    type: String,
    default: 'Manual Archive'
  },
  data: {
    type: Object, // Store full snapshot
    required: true
  }
}, { timestamps: true });

// Auto-delete after 5 years (default)
// We can use an index with expireAfterSeconds
// 5 years = 5 * 365 * 24 * 60 * 60 = 157680000 seconds
ArchiveSchema.index({ archivedAt: 1 }, { expireAfterSeconds: 157680000 });

module.exports = mongoose.model('Archive', ArchiveSchema);
