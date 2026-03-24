const User = require('../models/User');
const Attendance = require('../models/Attendance');
const MessCut = require('../models/MessCut');
const HomeGoing = require('../models/HomeGoing');
const Notification = require('../models/Notification');
const HostelClosing = require('../models/HostelClosing');

// View profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Profile not found' });

    // Check and apply nextFoodType 
    const now = new Date();
    if (user.nextFoodTypeEffectiveDate && now >= user.nextFoodTypeEffectiveDate) {
      user.foodType = user.nextFoodType;
      user.nextFoodType = undefined;
      user.nextFoodTypeEffectiveDate = undefined;
      await user.save();
    }

    const HostelSettings = require('../models/HostelSettings');
    const settings = await HostelSettings.findOne({ hostelName: user.hostelName });

    // Check if away
    const isAway = await HomeGoing.exists({ student: user._id, isReturned: false, status: { $ne: 'cancelled' } });

    res.json({ success: true, user: { ...user._doc, password: '', isAway: !!isAway }, foodPreferenceWindow: settings?.foodPreferenceWindow || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (email) user.email = email;
    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Food Preference
exports.updateFoodPreference = async (req, res) => {
  try {
    const { foodType } = req.body;
    if (!['veg', 'non-veg'].includes(foodType)) {
      return res.status(400).json({ success: false, message: 'Invalid food type' });
    }

    const HostelSettings = require('../models/HostelSettings');
    const settings = await HostelSettings.findOne({ hostelName: req.user.hostelName });
    
    if (!settings || !settings.foodPreferenceWindow || !settings.foodPreferenceWindow.startDate || !settings.foodPreferenceWindow.endDate) {
      return res.status(403).json({ success: false, message: 'Food preference change window is currently closed.' });
    }

    const now = new Date();
    const start = new Date(settings.foodPreferenceWindow.startDate);
    const end = new Date(settings.foodPreferenceWindow.endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (now < start || now > end) {
      return res.status(403).json({ success: false, message: 'Food preference change window is currently closed.' });
    }

    const user = await User.findById(req.user._id);
    
    // Effective date: first of next month
    const effectiveDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    user.nextFoodType = foodType;
    user.nextFoodTypeEffectiveDate = effectiveDate;
    user.lastFoodTypeChangedAt = now;
    
    await user.save();

    res.json({ success: true, message: 'Preference updated successfully. It will be applied from next month.', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Attendance Section 

exports.markSelfAttendance = async (req, res) => {
  try {
    const { status, date } = req.body;
    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if hostel is closed on this date
    const isClosed = await HostelClosing.findOne({
      startDate: { $lte: attendanceDate },
      endDate: { $gte: attendanceDate }
    });

    if (isClosed) {
      return res.status(400).json({ success: false, message: `Hostel is closed from ${isClosed.startDate.toDateString()} to ${isClosed.endDate.toDateString()}. Attendance cannot be marked.` });
    }

    // Check if already marked
    const existing = await Attendance.findOne({
      student: req.user._id,
      date: attendanceDate
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Attendance already marked for today.' });
    }

    // NEW: Check if currently away (Home Going)
    let finalStatus = status;
    const activeHomeGoing = await HomeGoing.findOne({
      student: req.user._id,
      isReturned: false,
      status: { $ne: 'cancelled' }
    });

    if (activeHomeGoing && status === 'present') {
      finalStatus = 'absent';
      // Optionally notify user why they are marked absent
    }

    const user = await User.findById(req.user._id);
    const attendance = new Attendance({
      student: req.user._id,
      studentName: user.name,
      date: attendanceDate,
      status: finalStatus,
      role: 'faculty',
      markedBy: req.user._id
    });

    await attendance.save();
    res.json({ success: true, message: 'Attendance marked', attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getSelfAttendanceHistory = async (req, res) => {
  try {
    const history = await Attendance.find({ student: req.user._id }).sort({ date: -1 }).limit(30);
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mess Cut Section

exports.requestMessCut = async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ success: false, message: 'Start date must be before end date.' });
    }

    // Check overlap
    const existingOverlap = await MessCut.findOne({
      student: req.user._id,
      status: { $ne: 'rejected' },
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
      ]
    });

    if (existingOverlap) {
      return res.status(400).json({
        success: false,
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
    res.json({ success: true, message: 'Mess cut request submitted !! ', messCut });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSelfMessCuts = async (req, res) => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const history = await MessCut.find({ 
      student: req.user._id,
      createdAt: { $gte: threeMonthsAgo }
    }).sort({ createdAt: -1 });
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Home Going Section

exports.markHomeGoing = async (req, res) => {
  try {
    const { leaveDate, returnDate, reason, place } = req.body;
    const user = await User.findById(req.user._id);

    if (returnDate && new Date(returnDate) <= new Date(leaveDate)) {
      return res.status(400).json({ success: false, message: 'Return time must be after leaving time.' });
    }

    const entry = new HomeGoing({
      student: req.user._id,
      studentName: user.name,
      leaveDate,
      returnDate,

      reason,
      place,
      status: 'marked' // No approval required for faculty
    });
    await entry.save();
    res.json({ success: true, message: 'Home going recorded', entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSelfHomeGoings = async (req, res) => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const history = await HomeGoing.find({ 
      student: req.user._id,
      createdAt: { $gte: threeMonthsAgo }
    }).sort({ createdAt: -1 });
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markHomeGoingReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

    const record = await HomeGoing.findOneAndUpdate(
      { _id: id, student: req.user._id, isReturned: false },
      { 
        isReturned: true, 
        returnDate: now, 
        returnTime: currentTime,
        status: 'returned'
      },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ success: false, message: 'Active record not found or already returned.' });
    }

    res.json({ success: true, message: 'Welcome back! Return marked.', record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Notifications Section

exports.getNotifications = async (req, res) => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Auto-delete request status notifications older 
    await Notification.deleteMany({
      type: 'request',
      createdAt: { $lt: twoWeeksAgo }
    });

    let notifications = await Notification.find({
      $or: [
        { user: req.user._id },
        { targetRole: 'faculty' },
        { targetRole: 'all' }
      ],
      createdAt: { $gte: oneMonthAgo }
    }).sort({ createdAt: -1 });

    //  dynamic notification for food window if open
    const HostelSettings = require('../models/HostelSettings');
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
    res.status(500).json({ success: false, message: error.message });
  }
};
