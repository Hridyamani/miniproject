const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Outgoing = require('../models/Outgoing');
const HomeGoing = require('../models/HomeGoing');
const MessCut = require('../models/MessCut');
const Notification = require('../models/Notification');
const HostelSettings = require('../models/HostelSettings');
const HostelClosedDay = require('../models/HostelClosedDay');

// Calculate distance between  GPS coordinates 
const calculateDistance = (lat1, lon1, lat2, lon2) => {

  // Round inputs to 6 decimal places
  lat1 = Number(lat1.toFixed(4));
  lon1 = Number(lon1.toFixed(4));
  lat2 = Number(lat2.toFixed(4));
  lon2 = Number(lon2.toFixed(4));

  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Get student profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Profile not found' });
    const settings = await HostelSettings.findOne({ hostelName: user.hostelName });
    res.json({ success: true, user, foodPreferenceWindow: settings?.foodPreferenceWindow || null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update student profile
exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    delete updates.role;
    delete updates.password;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    );

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Food Preference
exports.updateFoodPreference = async (req, res) => {
  try {
    const { foodType } = req.body;
    if (!['veg', 'non-veg'].includes(foodType)) {
      return res.status(400).json({ message: 'Invalid food type' });
    }

    const settings = await HostelSettings.findOne({ hostelName: req.user.hostelName });
    if (!settings || !settings.foodPreferenceWindow || !settings.foodPreferenceWindow.startDate || !settings.foodPreferenceWindow.endDate) {
      return res.status(403).json({ message: 'Food preference change window is currently closed.' });
    }

    const now = new Date();
    const start = new Date(settings.foodPreferenceWindow.startDate);
    const end = new Date(settings.foodPreferenceWindow.endDate);

    // End date is inclusive, so end of the day
    end.setHours(23, 59, 59, 999);

    if (now < start || now > end) {
      return res.status(403).json({ message: 'Food preference change window is currently closed.' });
    }

    const user = await User.findById(req.user._id);
    
    // Check if preference duration has passed
    const durationMonths = settings.foodPreferenceWindow.durationMonths || 3;
    if (user.lastFoodTypeChangedAt) {
      const validUntil = new Date(user.lastFoodTypeChangedAt);
      validUntil.setMonth(validUntil.getMonth() + durationMonths);
      
      if (now < validUntil) {
        return res.status(403).json({ message: `You can only change your preference after ${durationMonths} months from your last change.` });
      }
    }

    user.foodType = foodType;
    user.lastFoodTypeChangedAt = now;
    await user.save();

    res.json({ success: true, message: 'Food preference updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markOutgoing = async (req, res) => {
  try {
    const { date, timeLeaving, place } = req.body;

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const outgoing = new Outgoing({
      student: req.user._id,
      studentName: req.user.name,
      roomNumber: req.user.roomNumber,
      date: date ? new Date(date) : now,
      timeLeaving: timeLeaving || currentTime,
      place,
      status: 'active'
    });

    await outgoing.save();
    res.json({ success: true, message: 'Outgoing marked successfully', outgoing });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Request home going 
exports.requestHomeGoing = async (req, res) => {
  try {
    const { leaveDate, time, place, reason } = req.body;

    // 1. Date Validation: must be tomorrow onwards
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(leaveDate);
    if (selectedDate <= today) {
      return res.status(400).json({ message: 'Home-going request can only be from tomorrow onwards.' });
    }

    // 2. Open Time Validation
    const settings = await HostelSettings.findOne({ hostelName: req.user.hostelName });
    if (settings) {
      const { openTime, closeTime } = settings;
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const currentTotal = currentH * 60 + currentM;

      const [oh, om] = (openTime || '06:00').split(':').map(Number);
      const [ch, cm] = (closeTime || '21:30').split(':').map(Number);
      const openTotal = oh * 60 + om;
      const closeTotal = ch * 60 + cm;

      if (currentTotal >= openTotal && currentTotal < closeTotal) {
        return res.status(400).json({
          message: `Hostel is currently open (${openTime} to ${closeTime}). Please marking outgoing instead of requesting home-going.`
        });
      }
    }

    const homeGoing = new HomeGoing({
      student: req.user._id,
      studentName: req.user.name,
      roomNumber: req.user.roomNumber,
      leaveDate: new Date(leaveDate),
      time: time || '00:00',
      place,
      reason,
      recordingType: 'request',
      status: 'pending'
    });

    await homeGoing.save();
    res.json({ success: true, message: 'Home-going request submitted', homeGoing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};

// Mark home going 
exports.markHomeGoing = async (req, res) => {
  try {
    const { leaveDate, time, place } = req.body;
    
    // 1. Validation: Must be during open hours
    const settings = await HostelSettings.findOne({ hostelName: req.user.hostelName });
    if (settings) {
      const { openTime, closeTime } = settings;
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const currentTotal = currentH * 60 + currentM;

      const [oh, om] = (openTime || '06:00').split(':').map(Number);
      const [ch, cm] = (closeTime || '21:30').split(':').map(Number);
      const openTotal = oh * 60 + om;
      const closeTotal = ch * 60 + cm;

      if (currentTotal < openTotal || currentTotal >= closeTotal) {
        return res.status(400).json({
          message: `Hostel is currently closed (${closeTime} to ${openTime}). Home-going can only be marked during open hours.`
        });
      }
    }

    const homeGoing = new HomeGoing({
      student: req.user._id,
      studentName: req.user.name,
      roomNumber: req.user.roomNumber,
      leaveDate: new Date(leaveDate),
      time,
      place,
      recordingType: 'recording',
      status: 'active'
    });

    await homeGoing.save();
    res.json({ success: true, message: 'Home-going marked successfully', homeGoing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark return
exports.markReturn = async (req, res) => {
  try {

    const { type, requestId, latitude, longitude, returnDate, returnTime } = req.body;

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    // Debug
    console.log('BODY:', req.body);

    // Get hostel settings 
    const settings = await HostelSettings.findOne({ hostelName: req.user.hostelName });

    const HOSTEL_LAT = settings?.locationCoordinates?.latitude !== undefined
      ? parseFloat(settings.locationCoordinates.latitude.toFixed(4))
      : parseFloat(process.env.HOSTEL_LAT || '9.4265');

    const HOSTEL_LON = settings?.locationCoordinates?.longitude !== undefined
      ? parseFloat(settings.locationCoordinates.longitude.toFixed(4))
      : parseFloat(process.env.HOSTEL_LON || '76.9246');

    const ALLOWED_RADIUS = settings?.returnRadius || 200;

    const latNum = parseFloat(parseFloat(latitude).toFixed(4));
    const lonNum = parseFloat(parseFloat(longitude).toFixed(4));

    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({ message: 'Invalid GPS coordinates' });
    }

    console.log("USER:", latNum, lonNum);
    console.log("HOSTEL:", HOSTEL_LAT, HOSTEL_LON);

    const distance = calculateDistance(latNum, lonNum, HOSTEL_LAT, HOSTEL_LON);

    console.log("DISTANCE:", distance);
    const isWithinPremises = distance <= ALLOWED_RADIUS;

    if (!isWithinPremises) {
      return res.status(400).json({
        success: false,
        message: `Geofence Violation: You are ${distance.toFixed(0)}m away. Required within ${ALLOWED_RADIUS}m`
      });
    }

    let record;

    if (type === 'outgoing') {
      record = await Outgoing.findById(requestId);
      if (!record) return res.status(404).json({ message: 'Record not found' });

      // Time validation
      const outTime = new Date(record.date);
      const [h, m] = record.timeLeaving.split(':');
      outTime.setHours(parseInt(h), parseInt(m));

      const backTime = new Date(returnDate);
      const [rh, rm] = (returnTime || currentTime).split(':');
      backTime.setHours(parseInt(rh), parseInt(rm));

      if (backTime < outTime) {
        return res.status(400).json({ message: 'Return time cannot be before going time' });
      }

      record = await Outgoing.findByIdAndUpdate(
        requestId,
        {
          returnTime: returnTime || currentTime,
          returnDate: returnDate ? new Date(returnDate) : now,
          gpsLocation: { lat: latitude, lng: longitude },
          status: 'returned',
          isReturned: true,
          isGpsVerified: true
        },
        { new: true }
      );
    } else {
      record = await HomeGoing.findById(requestId);
      if (!record) return res.status(404).json({ message: 'Record not found' });

      // Time validation
      const outTime = new Date(record.leaveDate);
      const [h, m] = (record.time || "00:00").split(':');
      outTime.setHours(parseInt(h), parseInt(m));

      const backTime = new Date(returnDate);
      const [rh, rm] = (returnTime || currentTime).split(':');
      backTime.setHours(parseInt(rh), parseInt(rm));

      if (backTime < outTime) {
        return res.status(400).json({ message: 'Return time cannot be before going time' });
      }

      record = await HomeGoing.findByIdAndUpdate(
        requestId,
        {
          returnDate: returnDate ? new Date(returnDate) : now,
          returnTime: returnTime || currentTime,
          status: 'returned',
          isReturned: true
        },
        { new: true }
      );
    }


    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    res.json({ success: true, message: 'Return marked successfully. Welcome back!', record });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Mess Cut Request
exports.requestMessCut = async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;

    // Validation: Start date must be at least tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    if (start < tomorrow) {
      return res.status(400).json({ message: 'Mess cut can only start from tomorrow onwards.' });
    }

    // Validation: Minimum days check from HostelSettings
    const settings = await HostelSettings.findOne({ hostelName: req.user.hostelName });
    const minDays = settings?.minMessCutDays || 3;

    const diffTime = Math.abs(new Date(endDate) - new Date(startDate));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays < minDays) {
      return res.status(400).json({ message: `Mess cut must be for at least ${minDays} days.` });
    }

    // Validation: No overlapping mess cuts
    const existingOverlap = await MessCut.findOne({
      student: req.user._id,
      status: { $ne: 'rejected' }, // Allow if previously rejected
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
      ]
    });

    if (existingOverlap) {
      return res.status(400).json({
        message: `Mess cut overlap detected with an existing record (${existingOverlap.startDate.toDateString()} to ${existingOverlap.endDate.toDateString()}).`
      });
    }

    const messCut = new MessCut({
      student: req.user._id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: 'pending'
    });

    await messCut.save();
    res.json({ success: true, message: 'Mess cut request submitted successfully', messCut });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMessCuts = async (req, res) => {
  try {
    const messCuts = await MessCut.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, messCuts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get History
exports.getOutgoings = async (req, res) => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const outgoings = await Outgoing.find({ 
      student: req.user._id,
      createdAt: { $gte: threeMonthsAgo }
    }).sort({ createdAt: -1 });
    res.json({ success: true, outgoings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getHomeGoings = async (req, res) => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const homeGoings = await HomeGoing.find({ 
      student: req.user._id,
      $or: [
        { createdAt: { $gte: threeMonthsAgo } },
        { leaveDate: { $gte: threeMonthsAgo } }
      ]
    }).sort({ createdAt: -1 });
    res.json({ success: true, homeGoings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({ student: req.user._id }).sort({ date: -1 });
    const closedDays = await HostelClosedDay.find().sort({ date: -1 }).limit(100);
    res.json({ success: true, attendance, closedDays });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Return notifications
    const notifications = await Notification.find({
      $or: [
        { user: req.user._id },
        { targetRole: { $in: ['all', 'student'] } }
      ],
      createdAt: { $gte: oneMonthAgo }
    }).sort({ createdAt: -1 });

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
