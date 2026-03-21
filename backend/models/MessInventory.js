const mongoose = require('mongoose');

const MessInventorySchema = new mongoose.Schema({
  month: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  leftOutAmount: {
    type: Number,
    default: 0
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Each month/year combo should be unique
MessInventorySchema.index({ month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('MessInventory', MessInventorySchema);
