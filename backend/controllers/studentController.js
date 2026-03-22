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

  // Round inputs to 6 decimal places for better precision
  lat1 = Number(Number(lat1).toFixed(6));
  lon1 = Number(Number(lon1).toFixed(6));
  lat2 = Number(Number(lat2).toFixed(6));
  lon2 = Number(Number(lon2).toFixed(6));

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
    
    // Check and apply nextFoodType if effective date has arrived
    const now = new Date();
    if (user.nextFoodTypeEffectiveDate && now >= user.nextFoodTypeEffectiveDate) {
      user.foodType = user.nextFoodType;
      user.nextFoodType = undefined;
      user.nextFoodTypeEffectiveDate = undefined;
      await user.save();
    }

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

    if (updates.hostelName) updates.hostelName = updates.hostelName.toUpperCase();
    if (updates.department) updates.department = updates.department.toUpperCase();

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

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (now < start || now > end) {
      return res.status(403).json({ message: 'Food preference change window is currently closed.' });
    }

    const user = await User.findById(req.user._id);

    const effectiveDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    user.nextFoodType = foodType;
    user.nextFoodTypeEffectiveDate = effectiveDate;
    user.lastFoodTypeChangedAt = now;
    
    await user.save();

    res.json({ success: true, message: 'Preference updated successfully. It will be applied from next month.', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markOutgoing = async (req, res) => {
  try {
    const { date, timeLeaving, place } = req.body;

    const existing = await Outgoing.findOne({ student: req.user._id, status: 'active' });
    if (existing) {
      return res.status(400).json({ message: 'You already have an active outgoing record!' });
    }

    // Open hours check
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
          message: `Hostel is currently closed (${closeTime} to ${openTime}). Outgoing can only be marked during open hours.`
        });
      }
    }

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(leaveDate);
    if (selectedDate <= today) {
      return res.status(400).json({ message: 'Home-going request can only be from tomorrow onwards.' });
    }

    const existingHG = await HomeGoing.findOne({ student: req.user._id, status: { $in: ['active', 'pending'] } });
    if (existingHG) {
      return res.status(400).json({ message: 'You already have an active or pending home-going record!' });
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

    const existingHG = await HomeGoing.findOne({ student: req.user._id, status: { $in: ['active', 'pending'] } });
    if (existingHG) {
      return res.status(400).json({ message: 'You already have an active or pending home-going record!' });
    }

    // Open hours check
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

// Cancel Home-Going
exports.cancelHomeGoing = async (req, res) => {
  try {
    const { requestId, cancelReason } = req.body;
    if (!cancelReason) return res.status(400).json({ message: 'Strict Cancellation reason is required.' });

    const homeGoing = await HomeGoing.findById(requestId);
    if (!homeGoing) return res.status(404).json({ message: 'Record not found' });
    if (homeGoing.student.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Unauthorized' });

    if (['cancelled', 'returned'].includes(homeGoing.status)) {
      return res.status(400).json({ message: 'Cannot cancel an already ' + homeGoing.status + ' record.' });
    }

    homeGoing.status = 'cancelled';
    homeGoing.cancelReason = cancelReason;
    await homeGoing.save();

    const Notification = require('../models/Notification');
    const authorities = await User.find({ role: 'authority', hostelName: req.user.hostelName });
    
    for (const auth of authorities) {
      await Notification.create({
        user: auth._id,
        title: 'Home-Going Cancelled',
        message: `${req.user.name} cancelled their home-going request. Reason: ${cancelReason}`,
        type: 'request',
        targetRole: 'authority'
      });
    }

    res.json({ success: true, message: 'Home-going request cancelled successfully', homeGoing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark return
exports.markReturn = async (req, res) => {
  try {
    const { type, requestId, latitude, longitude } = req.body;

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    // Use Case Insensitive Match for Hostel Name Settings to avoid matching failures
    const settings = await HostelSettings.findOne({ 
      hostelName: { $regex: new RegExp(`^${req.user.hostelName}$`, 'i') } 
    });

    const HOSTEL_LAT = settings?.locationCoordinates?.latitude !== undefined
      ? parseFloat(settings.locationCoordinates.latitude)
      : parseFloat(process.env.HOSTEL_LAT || '9.4265');

    const HOSTEL_LON = settings?.locationCoordinates?.longitude !== undefined
      ? parseFloat(settings.locationCoordinates.longitude)
      : parseFloat(process.env.HOSTEL_LON || '76.9246');

    const ALLOWED_RADIUS = settings?.returnRadius || 200;

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({ message: 'Invalid GPS coordinates accurately capturing your location.' });
    }

    const distance = calculateDistance(latNum, lonNum, HOSTEL_LAT, HOSTEL_LON);
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

      record = await Outgoing.findByIdAndUpdate(
        requestId,
        {
          returnTime: currentTime,
          returnDate: now,
          gpsLocation: { lat: latNum, lng: lonNum },
          status: 'returned',
          isReturned: true,
          isGpsVerified: true
        },
        { new: true }
      );
    } else {
      record = await HomeGoing.findById(requestId);
      if (!record) return res.status(404).json({ message: 'Record not found' });

      record = await HomeGoing.findByIdAndUpdate(
        requestId,
        {
          returnDate: now,
          returnTime: currentTime,
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
      status: 'approved' // Automatically approved if all constraints are met
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

// Get Notifications
exports.getNotifications = async (req, res) => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Return notifications
    let notifications = await Notification.find({
      $or: [
        { user: req.user._id },
        { targetRole: { $in: ['all', 'student'] } }
      ],
      createdAt: { $gte: oneMonthAgo }
    }).sort({ createdAt: -1 });

    // Inject dynamic notification for food window if open
    const settings = await HostelSettings.findOne({ hostelName: req.user.hostelName });
    if (settings && settings.foodPreferenceWindow && settings.foodPreferenceWindow.startDate && settings.foodPreferenceWindow.endDate) {
      const now = new Date();
      const start = new Date(settings.foodPreferenceWindow.startDate);
      const end = new Date(settings.foodPreferenceWindow.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      if (now >= start && now <= end) {
        notifications.unshift({
          _id: 'food_window_open',
          title: '🍔 Food Preference Window Open!',
          message: `The window to update your food preference is currently open from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}. Go to your dashboard to make changes.`,
          createdAt: new Date(),
          type: 'general'
        });
      }
    }

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
