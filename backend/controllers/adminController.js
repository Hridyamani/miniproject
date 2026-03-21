const User = require('../models/User');
const Attendance = require('../models/Attendance');
const MessCut = require('../models/MessCut');
const Outgoing = require('../models/Outgoing');
const HomeGoing = require('../models/HomeGoing');
const Notification = require('../models/Notification');
const HostelSettings = require('../models/HostelSettings');
const HostelClosing = require('../models/HostelClosing');
const Archive = require('../models/Archive');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Today's Activities
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const todayOutgoings = await Outgoing.countDocuments({ createdAt: { $gte: startOfToday, $lt: endOfToday } });
    const todayHomeGoings = await HomeGoing.countDocuments({ createdAt: { $gte: startOfToday, $lt: endOfToday } });
    const [outgoingReturns, homegoingReturns] = await Promise.all([
      Outgoing.countDocuments({ status: 'returned', updatedAt: { $gte: startOfToday, $lt: endOfToday } }),
      HomeGoing.countDocuments({ status: 'returned', updatedAt: { $gte: startOfToday, $lt: endOfToday } })
    ]);
    const todayReturns = outgoingReturns + homegoingReturns;

    const activeMessCuts = await MessCut.countDocuments({
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      status: 'approved'
    });

    // 2. Pending Requests Summary
    const pendingMessCuts = await MessCut.countDocuments({ status: 'pending' });
    const pendingHomeGoings = await HomeGoing.countDocuments({ status: 'pending' });

    const totalPending = pendingMessCuts + pendingHomeGoings;

    // 3. Weekly Activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyPending = await Promise.all([
      MessCut.countDocuments({ status: 'pending', createdAt: { $gte: sevenDaysAgo } }),
      HomeGoing.countDocuments({ status: 'pending', createdAt: { $gte: sevenDaysAgo } })
    ]).then(counts => counts.reduce((a, b) => a + b, 0));

    const weeklyOutgoings = await Outgoing.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const weeklyHomeGoings = await HomeGoing.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    res.json({
      success: true,
      stats: {
        today: { todayOutgoings, todayHomeGoings, todayReturns, activeMessCuts },
        pending: { pendingMessCuts, pendingHomeGoings, totalPending, weeklyPending },
        weekly: { weeklyOutgoings, weeklyHomeGoings }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// User Management
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    let query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAttendanceReport = async (req, res) => {
  try {
    const { date } = req.query;
    const searchDate = date ? new Date(date) : new Date();
    searchDate.setHours(0, 0, 0, 0);

    // Get all current students 
    const students = await User.find({ role: 'student', isActive: true }).select('name userId roomNumber department');

    // Get attendance for these students on this date
    const attendance = await Attendance.find({
      date: searchDate
    }).populate('markedBy', 'name role');

    const report = students.map(s => {
      const att = attendance.find(a => a.student.toString() === s._id.toString());
      return {
        _id: s._id,
        name: s.name,
        userId: s.userId,
        roomNumber: s.roomNumber,
        department: s.department,
        status: att ? att.status : 'not marked',
        markedBy: att?.markedBy?.name || '—',
        markedByRole: att?.markedBy?.role || '—'
      };
    });

    res.json({ success: true, report, date: searchDate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const userData = req.body;

    // Auto-convert to Block Letters (Task 6)
    if (userData.department) userData.department = userData.department.toUpperCase();
    if (userData.hostelName) userData.hostelName = userData.hostelName.toUpperCase();

    const exists = await User.findOne({
      $or: [{ userId: userData.userId }, { email: userData.email }]
    });

    if (exists) return res.status(400).json({ message: 'User ID or Email already exists' });

    const user = new User(userData);
    await user.save();
    res.json({ success: true, message: 'User created successfully', user: { userId: user.userId, name: user.name } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // convert to Block Letters (Task 6)
    if (updates.department) updates.department = updates.department.toUpperCase();
    if (updates.hostelName) updates.hostelName = updates.hostelName.toUpperCase();

    // Don't update password through this route unless explicitly provided and hashed
    if (updates.password) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    } else {
      delete updates.password;
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ success: true, message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Archive Logic (Task 5-6)
exports.archiveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const archive = new Archive({
      originalId: user._id,
      name: user.name,
      userId: user.userId,
      role: user.role,
      email: user.email,
      phone: user.phone,
      department: user.department,
      roomNumber: user.roomNumber,
      hostelName: user.hostelName,
      admissionNo: user.admissionNo,
      semester: user.semester,
      guardiansName: user.guardiansName,
      guardiansPhone: user.guardiansPhone,
      address: user.address,
      collegeName: user.collegeName,
      gender: user.gender,
      bloodGroup: user.bloodGroup,
      dateOfBirth: user.dateOfBirth,
      dateOfAdmission: user.dateOfAdmission,
      data: user.toObject()
    });

    await archive.save();
    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'User moved to archive.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getArchives = async (req, res) => {
  try {
    const archives = await Archive.find().sort({ archivedAt: -1 });
    res.json({ success: true, archives });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteArchive = async (req, res) => {
  try {
    await Archive.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Archive entry deleted permanently.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Outgoing Return Tracking
exports.getReturnTracking = async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = {};

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      query = { createdAt: { $gte: startDate, $lte: endDate } };
    } else {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      query = { createdAt: { $gte: last24h } };
    }

    const outgoings = await Outgoing.find(query)
      .populate('student', 'name roomNumber admissionNo userId')
      .sort({ createdAt: -1 });

    const homegoings = await HomeGoing.find({
      ...query,
      status: { $in: ['active', 'returned'] }
    })
      .populate('student', 'name roomNumber admissionNo userId')
      .sort({ createdAt: -1 });

    const combined = [
      ...outgoings.map(o => ({ ...o._doc, logType: 'Outgoing' })),
      ...homegoings.map(h => ({ ...h._doc, logType: 'HomeGoing', timeLeaving: h.time }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, tracking: combined });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mess Management / Reports
exports.getMessCuts = async (req, res) => {
  try {
    const messCuts = await MessCut.find().populate('student', 'name roomNumber userId').sort({ createdAt: -1 });
    res.json({ success: true, messCuts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Security Settings — update credentials + hostel settings
exports.updateSecuritySettings = async (req, res) => {
  try {
    const { email, password, locationCoordinates, returnRadius, minMessCutDays, openTime, closeTime, foodPreferenceWindow } = req.body;


    const fs = require('fs');
    const path = require('path');

    // 1. Update admin credentials in DB
    const admin = await User.findById(req.user._id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    if (email) admin.email = email;
    if (password) admin.password = password;
    await admin.save();

    // 2. Update hostel settings
    if (locationCoordinates || returnRadius !== undefined || minMessCutDays !== undefined || openTime || closeTime || foodPreferenceWindow) {
      const settingsUpdate = {};
      if (locationCoordinates) settingsUpdate.locationCoordinates = locationCoordinates;
      if (returnRadius !== undefined) settingsUpdate.returnRadius = returnRadius;
      if (minMessCutDays !== undefined) settingsUpdate.minMessCutDays = minMessCutDays;
      if (openTime) settingsUpdate.openTime = openTime;
      if (closeTime) settingsUpdate.closeTime = closeTime;
      if (foodPreferenceWindow) settingsUpdate.foodPreferenceWindow = foodPreferenceWindow;



      await HostelSettings.findOneAndUpdate(
        { admin: admin._id },
        { $set: settingsUpdate },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    }

    // 3. Update .env
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      let envLines = fs.readFileSync(envPath, 'utf8').split('\n');

      if (email) {
        envLines = envLines.map(line => line.startsWith('EMAIL_USER=') ? `EMAIL_USER=${email}` : line);
      }
      if (password) {
        envLines = envLines.map(line => line.startsWith('EMAIL_PASS=') ? `EMAIL_PASS=${password}` : line);
      }

      fs.writeFileSync(envPath, envLines.join('\n'));
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get hostel settings for the current admin
exports.getHostelSettings = async (req, res) => {
  try {
    let settings = await HostelSettings.findOne({ admin: req.user._id });
    if (!settings) {
      // Create default settings
      settings = await HostelSettings.create({
        hostelName: req.user.hostelName || 'Default Hostel',
        admin: req.user._id,
        locationCoordinates: { latitude: 0, longitude: 0 },
        returnRadius: 100,
        minMessCutDays: 3
      });
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Transfer admin role to another user
exports.transferAdmin = async (req, res) => {
  try {
    const { newAdminUserId } = req.body;
    const currentAdmin = await User.findById(req.user._id);
    if (!currentAdmin || currentAdmin.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can transfer admin role' });
    }

    const newAdmin = await User.findOne({ userId: newAdminUserId });
    if (!newAdmin) return res.status(404).json({ message: 'Target user not found' });

    // Transfer hostel settings to new admin
    await HostelSettings.findOneAndUpdate(
      { admin: currentAdmin._id },
      { admin: newAdmin._id }
    );

    // Update roles
    newAdmin.role = 'admin';
    newAdmin.hostelName = currentAdmin.hostelName;
    await newAdmin.save();

    currentAdmin.role = 'faculty'; // Demote current admin to faculty
    await currentAdmin.save();

    res.json({ success: true, message: `Admin role transferred to ${newAdmin.name}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Notification Management
exports.publishNotification = async (req, res) => {
  try {
    const { title, message, targetRole, type } = req.body;
    const notification = new Notification({
      title,
      message,
      targetRole: targetRole || 'all',
      type: type || 'general',
      sender: req.user._id
    });
    await notification.save();
    res.json({ success: true, message: 'Notification published successfully', notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all notifications (admin view)
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ sender: req.user._id })
      .sort({ createdAt: -1 })
      .populate('sender', 'name userId');
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndDelete({ _id: id, sender: req.user._id });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hostel Closing Actions
exports.markHostelClosing = async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const closing = new HostelClosing({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      admin: req.user._id
    });
    await closing.save();
    res.json({ success: true, message: 'Hostel closing dates recorded.', closing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getHostelClosingHistory = async (req, res) => {
  try {
    const history = await HostelClosing.find().sort({ startDate: -1 });
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteHostelClosing = async (req, res) => {
  try {
    await HostelClosing.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Hostel closing record removed.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
