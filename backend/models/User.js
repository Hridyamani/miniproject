const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'authority', 'faculty', 'student'],
    required: true
  },

  // Common fields
  department: { type: String },
  dateOfBirth: { type: Date },
  bloodGroup: { type: String },
  hostelName: { type: String },
  collegeName: { type: String },

  // Student specific fields
  admissionNo: { type: String },
  semester: { type: String },
  dateOfAdmission: { type: Date },
  roomNumber: { type: String },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  guardiansName: { type: String },
  guardiansPhone: { type: String },
  branch: { type: String },
  address: { type: String },
  authorityRole: { type: String }, // e.g. Warden, Mess Secretary, etc.
  foodType: { type: String, enum: ['veg', 'non-veg'], default: 'non-veg' },
  nextFoodType: { type: String, enum: ['veg', 'non-veg'] },
  nextFoodTypeEffectiveDate: { type: Date },
  lastFoodTypeChangedAt: { type: Date },

  // Security settings
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Encrypt password 
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
