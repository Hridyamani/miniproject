const mongoose = require('mongoose');

const hostelSettingsSchema = new mongoose.Schema({
    hostelName: {
        type: String,
        required: true,
        unique: true
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    locationCoordinates: {
        latitude: { type: Number, default: 0 },
        longitude: { type: Number, default: 0 }
    },
    returnRadius: {
        type: Number, // in meters
        default: 100
    },
    minMessCutDays: {
        type: Number,
        default: 3
    },
    openTime: {
        type: String,
        default: '06:00'
    },
    closeTime: {
        type: String,
        default: '21:30'
    },
    foodPreferenceWindow: {
        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
        durationMonths: { type: Number, default: 3 }
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('HostelSettings', hostelSettingsSchema);
