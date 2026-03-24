const User = require('../models/User');
const Attendance = require('../models/Attendance');
const MessCut = require('../models/MessCut');
const Outgoing = require('../models/Outgoing');
const HomeGoing = require('../models/HomeGoing');
const Notification = require('../models/Notification');
const HostelSettings = require('../models/HostelSettings');
const HostelClosing = require('../models/HostelClosing');
const Archive = require('../models/Archive');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const generatePassword = require('../utils/passwordGenerator');
const sendEmail = require('../utils/sendEmail');

//  User IDGenerator
const getNextUserId = async (role, admissionNo = null) => {
  if (role === 'student' && admissionNo) {
    return `STU-${admissionNo.toUpperCase().trim()}`;
  }
  const currentYear = new Date().getFullYear();
  const rolePrefixes = {
    student: 'STU',
    faculty: 'FAC',
    authority: 'ATH',
    admin: 'ADM'
  };
  const prefix = rolePrefixes[role] || role.substring(0, 3).toUpperCase();

  // Find users from this year with this specific role 
  const regex = new RegExp(`^${prefix}-${currentYear}-`);
  const count = await User.countDocuments({ role, userId: regex });

  // Format as 3-digit serial
  const serial = (count + 1).toString().padStart(3, '0');
  return `${prefix}-${currentYear}-${serial}`;
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    //  Today's Activities
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

    // Pending Requests Summary
    const pendingMessCuts = await MessCut.countDocuments({ status: 'pending' });
    const pendingHomeGoings = await HomeGoing.countDocuments({ status: 'pending' });

    const totalPending = pendingMessCuts + pendingHomeGoings;

    const activeUsersCount = await User.countDocuments();
    
    const todayApprovedHomeGoings = await HomeGoing.countDocuments({
      status: 'approved',
      approvedAt: { $gte: startOfToday, $lt: endOfToday }
    });

    // Weekly Activity
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
        today: { todayOutgoings, todayHomeGoings, todayReturns, activeMessCuts, todayApprovedHomeGoings },
        pending: { pendingMessCuts, pendingHomeGoings, totalPending, weeklyPending },
        weekly: { weeklyOutgoings, weeklyHomeGoings },
        totalUsers: activeUsersCount
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

    // convert to Block Letters
    if (userData.department) userData.department = userData.department.toUpperCase();
    if (userData.hostelName) userData.hostelName = userData.hostelName.toUpperCase();

    // Authority Registration Rule: Email must exist
    if (userData.role === 'authority') {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        return res.status(400).json({ message: 'Authority user can only be added if the email already exists in the system.' });
      }
      
      // convert to Block Letters for consistency
      if (userData.department) existingUser.department = userData.department.toUpperCase();
      if (userData.hostelName) existingUser.hostelName = userData.hostelName.toUpperCase();
      
      existingUser.role = 'authority';
      existingUser.authorityRole = userData.authorityRole;
      if (userData.userId) existingUser.userId = userData.userId;
      if (userData.name) existingUser.name = userData.name;
      if (userData.phone) existingUser.phone = userData.phone;
      if (userData.roomNumber) existingUser.roomNumber = userData.roomNumber;
      
      await existingUser.save();

      return res.json({ 
        success: true, 
        message: `User ${existingUser.name} has been promoted to Authority role successfully.`,
        user: { userId: existingUser.userId, name: existingUser.name }
      });
    }

    // Standard User Creation
    if (!userData.userId) {
      userData.userId = await getNextUserId(userData.role, userData.admissionNo);
    }

    const exists = await User.findOne({
      $or: [{ userId: userData.userId }, { email: userData.email }]
    });

    if (exists) return res.status(400).json({ message: 'User ID or Email already exists' });

    // Auto-Generate Password
    const rawPassword = generatePassword();
    userData.password = rawPassword;

    const user = new User(userData);
    await user.save(); 

    // Send Credentials via Email 
    try {
      await sendEmail({
          email: user.email,
          subject: 'Your Hostel Management Account Details',
          message: `Hello ${user.name},\n\nYour account has been created.\n\nUser ID: ${user.userId}\nPassword: ${rawPassword}\n\nPlease log in and change your password after first login.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:4200'}\n\nThank you.`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #2563eb;">Welcome to StaySphere!</h2>
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>Your account has been created by the administrator.</p>
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>User ID:</strong> <code style="color: #e11d48;">${user.userId}</code></p>
                <p style="margin: 5px 0;"><strong>Password:</strong> <code style="color: #e11d48;">${rawPassword}</code></p>
              </div>
              <p>Please log in and change your password after your first login.</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}" style="display: inline-block; background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Login Now</a>
              <p style="margin-top: 20px; font-size: 13px; color: #64748b;">If you did not expect this, please contact the hostel admin.</p>
            </div>
          `
      });
    } catch (err) {
      // Quietly handle email failure as account was already created
    }

    res.json({ 
      success: true, 
      message: 'User created successfully. Credentials sent via email.',
      user: { userId: user.userId, name: user.name } 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // convert to Block Letters
    if (updates.department) updates.department = updates.department.toUpperCase();
    if (updates.hostelName) updates.hostelName = updates.hostelName.toUpperCase();

    if (updates.password) {
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

// Archive Logic
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

exports.bulkArchiveUsers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ message: 'No IDs provided' });

    const users = await User.find({ _id: { $in: ids } });
    if (!users.length) return res.status(404).json({ message: 'No users found to archive' });

    const archives = users.map(u => ({
      originalId: u._id,
      name: u.name,
      userId: u.userId,
      role: u.role,
      email: u.email,
      phone: u.phone,
      department: u.department,
      roomNumber: u.roomNumber,
      hostelName: u.hostelName,
      admissionNo: u.admissionNo,
      semester: u.semester,
      guardiansName: u.guardiansName,
      guardiansPhone: u.guardiansPhone,
      address: u.address,
      collegeName: u.collegeName,
      gender: u.gender,
      bloodGroup: u.bloodGroup,
      dateOfBirth: u.dateOfBirth,
      dateOfAdmission: u.dateOfAdmission,
      data: u.toObject()
    }));

    await Archive.insertMany(archives);
    await User.deleteMany({ _id: { $in: ids } });

    res.json({ success: true, message: `${users.length} users moved to archive.` });
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

exports.restoreArchive = async (req, res) => {
  try {
    const archive = await Archive.findById(req.params.id);
    if (!archive) return res.status(404).json({ message: 'Archive entry not found' });

    // Restore user from the data
    const userData = archive.data;
    const user = new User(userData);
    await user.save();
    
    await Archive.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: `Record restored for ${user.name}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.bulkRestoreArchives = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ message: 'No IDs provided' });

    const archives = await Archive.find({ _id: { $in: ids } });
    if (!archives.length) return res.status(404).json({ message: 'Archives not found' });

    const usersToRestore = archives.map(a => a.data);
    
    await User.insertMany(usersToRestore);
    await Archive.deleteMany({ _id: { $in: ids } });

    res.json({ success: true, message: `${archives.length} records restored.` });
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

exports.bulkDeleteArchives = async (req, res) => {
  try {
    const { ids } = req.body;
    await Archive.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: `${ids.length} archive records removed permanently.` });
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

exports.bulkDeleteUsers = async (req, res) => {
  try {
    const { ids } = req.body;
    await User.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: `${ids.length} users removed permanently.` });
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

// Security Settings 
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
      const settingsUpdate = { 
        admin: admin._id,
        hostelName: admin.hostelName 
      };
      
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

// Get all notifications 
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

// Bulk Student Upload
exports.downloadStudentTemplate = (req, res) => {
  const headers = [
    'User ID', 'Full Name', 'Email', 'Phone', 'Department', 'DOB', 
    'Blood Group', 'College Name', 'Hostel Name', 'Room Number', 
    'Admission No', 'Semester', 'Guardian Name', 'Guardian Phone', 'Address'
  ];
  
  const sampleData = [
    {
      'User ID': 'STD-2026-001',
      'Full Name': 'John Doe',
      'Email': 'john@example.com',
      'Phone': '9876543210',
      'Department': 'CSE',
      'DOB': '2005-01-01',
      'Blood Group': 'O+',
      'College Name': 'CEC',
      'Hostel Name': 'MENS HOSTEL',
      'Room Number': '101',
      'Admission No': 'ADM123',
      'Semester': 'S1',
      'Guardian Name': 'Parent Doe',
      'Guardian Phone': '9876543211',
      'Address': 'Sample Address'
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Student_Upload_Template.xlsx');
  res.send(buffer);
};

exports.previewBulkStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const results = [];
    const emails = new Set();
    const admissionNos = new Set();
    const userIds = new Set();

    // Fetch existing data for duplicate checks
    const existingUsers = await User.find({ role: 'student' }).select('email admissionNo userId');
    const dbEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
    const dbAdmissionNos = new Set(existingUsers.map(u => u.admissionNo?.toLowerCase()));
    const dbUserIds = new Set(existingUsers.map(u => u.userId.toLowerCase()));
    for (const row of data) {
      let userId = row['User ID']?.toString().trim();
      const admissionNo = row['Admission No']?.toString().trim();

      // Auto-generate User ID if missing 
      if (!userId) {
        userId = await getNextUserId('student', admissionNo);
      }

      const student = {
        userId,
        name: row['Full Name']?.toString().trim(),
        email: row['Email']?.toString().trim().toLowerCase(),
        phone: row['Phone']?.toString().trim(),
        department: row['Department']?.toString().trim().toUpperCase(),
        dateOfBirth: row['DOB'],
        bloodGroup: row['Blood Group']?.toString().trim().toUpperCase(),
        collegeName: row['College Name']?.toString().trim(),
        hostelName: row['Hostel Name']?.toString().trim().toUpperCase(),
        roomNumber: row['Room Number']?.toString().trim(),
        admissionNo,
        semester: row['Semester']?.toString().trim().toUpperCase(),
        guardiansName: row['Guardian Name']?.toString().trim(),
        guardiansPhone: row['Guardian Phone']?.toString().trim(),
        address: row['Address']?.toString().trim(),
        role: 'student'
      };

      const errors = [];
      
      // Auto-Generate Password
      student.password = generatePassword();
      const rawPlainPassword = student.password; // temporary store for email content in preview? 
      // Actually we send email after confirm.
      
      // Mandatory Fields check
      if (!student.userId) errors.push('User ID generation failed');
      if (!student.name) errors.push('Full Name is missing');
      if (!student.email) errors.push('Email is missing');
      if (!student.phone) errors.push('Phone is missing');
      if (!student.admissionNo) errors.push('Admission No is missing');
      if (!student.semester) errors.push('Semester is missing');

      // Email Format check
      if (student.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) {
        errors.push('Invalid email format');
      }

      // Semester format check
      if (student.semester && !/^S[1-8]$/.test(student.semester)) {
        errors.push('Semester must be S1-S8');
      }

      // Blood Group validation 
      const validBG = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      if (student.bloodGroup && !validBG.includes(student.bloodGroup)) {
        errors.push('Invalid blood group');
      }

      // Duplicate check 
      if (student.email && emails.has(student.email)) errors.push('Duplicate Email in file');
      if (student.admissionNo && admissionNos.has(student.admissionNo.toLowerCase())) errors.push('Duplicate Admission No in file');
      if (student.userId && userIds.has(student.userId.toLowerCase())) errors.push('Duplicate User ID in file');

      // Duplicate check 
      if (student.email && dbEmails.has(student.email)) errors.push('Email already exists in database');
      if (student.admissionNo && dbAdmissionNos.has(student.admissionNo.toLowerCase())) errors.push('Admission No exists in database');
      if (student.userId && dbUserIds.has(student.userId.toLowerCase())) errors.push('User ID exists in database');

      if (student.email) emails.add(student.email);
      if (student.admissionNo) admissionNos.add(student.admissionNo.toLowerCase());
      if (student.userId) userIds.add(student.userId.toLowerCase());

      results.push({
        ...student,
        status: errors.length === 0 ? 'valid' : 'invalid',
        error: errors.join(', ')
      });
    }

    res.json({ success: true, preview: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.confirmBulkUpload = async (req, res) => {
  try {
    const { students } = req.body;
    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ message: 'No student data provided' });
    }

    const validStudents = students.filter(s => s.status === 'valid');
    if (validStudents.length === 0) {
      return res.status(400).json({ message: 'No valid student data to save' });
    }

    // Process students: assign real passwords and User IDs if they became stale
    const toSave = [];
    const emailsToNotify = [];

    for (const s of validStudents) {
      const rawPassword = generatePassword(); // Final random password
      const { status, error, ...data } = s;
      
      // Store plain details for notification
      emailsToNotify.push({
        email: data.email,
        name: data.name,
        userId: data.userId,
        password: rawPassword
      });

      // Hash password manually before insertMany
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(rawPassword, salt);
      toSave.push(data);
    }

    await User.insertMany(toSave);

    // Send emails in background
    notifyUsers(emailsToNotify);

    res.json({ 
      success: true, 
      message: `${toSave.length} students created successfully. Emails are being sent in background.` 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const notifyUsers = async (users) => {
  for (const user of users) {
    try {
      await sendEmail({
        email: user.email,
        subject: 'Your Hostel Management Account Details',
        message: `Hello ${user.name},\n\nYour account has been created.\n\nUser ID: ${user.userId}\nPassword: ${user.password}\n\nPlease log in and change your password after first login.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:4200'}\n\nThank you.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb;">Welcome to StaySphere!</h2>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Your account has been created by the administrator.</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>User ID:</strong> <code style="color: #e11d48;">${user.userId}</code></p>
              <p style="margin: 5px 0;"><strong>Password:</strong> <code style="color: #e11d48;">${user.password}</code></p>
            </div>
            <p>Please log in and change your password after your first login.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}" style="display: inline-block; background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Login Now</a>
            <p style="margin-top: 20px; font-size: 13px; color: #64748b;">If you did not expect this, please contact the hostel admin.</p>
          </div>
        `
      });
    } catch (err) {
      // Quietly handle individual email failure
    }  }
};
