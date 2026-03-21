const User = require('../models/User');
const Attendance = require('../models/Attendance');
const MessCut = require('../models/MessCut');
const HomeGoing = require('../models/HomeGoing');
const Outgoing = require('../models/Outgoing');
const Notification = require('../models/Notification');
const HostelClosedDay = require('../models/HostelClosedDay');
const HostelClosing = require('../models/HostelClosing');


// Get pending requests 
exports.getPendingRequests = async (req, res) => {
  try {
    const homeGoings = await HomeGoing.find({ status: 'pending', recordingType: 'request' })
      .populate('student', 'name roomNumber')
      .sort({ createdAt: -1 });

    const messCuts = await MessCut.find({ status: 'pending' })
      .populate('student', 'name roomNumber')
      .sort({ createdAt: -1 });

    res.json({ success: true, homeGoings, messCuts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve/Reject requests
exports.updateHomeGoing = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const record = await HomeGoing.findByIdAndUpdate(id, {
      status, remarks, approvedBy: req.user._id, approvedAt: new Date()
    }, { new: true });

    if (record) {
      await Notification.create({
        user: record.student,
        title: 'Home-going Request Status',
        message: `Your home-going request for ${record.leaveDate.toLocaleDateString()} has been ${status}${remarks ? '. Remarks: ' + remarks : ''}.`,
        type: 'request'
      });
    }

    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMessCut = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const record = await MessCut.findByIdAndUpdate(id, {
      status, remarks, approvedBy: req.user._id, approvedAt: new Date()
    }, { new: true });

    if (record) {
      await Notification.create({
        user: record.student,
        title: 'Mess-cut Request Status',
        message: `Your mess-cut request from ${record.startDate.toLocaleDateString()} has been ${status}${remarks ? '. Remarks: ' + remarks : ''}.`,
        type: 'request'
      });
    }

    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark attendance 
exports.markAttendance = async (req, res) => {
  try {
    const { attendance, date } = req.body; // Expects array of { student, status, remarks }
    const markingDate = date ? new Date(date) : new Date();
    markingDate.setHours(0, 0, 0, 0);

    // Check if hostel is closed on this date
    const isClosed = await HostelClosing.findOne({
      startDate: { $lte: markingDate },
      endDate: { $gte: markingDate }
    });

    if (isClosed) {
      return res.status(400).json({ success: false, message: `Hostel is closed from ${isClosed.startDate.toDateString()} to ${isClosed.endDate.toDateString()}. Attendance cannot be marked.` });
    }

    const results = [];
    for (const item of attendance) {
      const { student: studentId, status, remarks } = item;
      const student = await User.findById(studentId);
      if (!student) continue;

      let record = await Attendance.findOne({ student: studentId, date: markingDate });

      if (record) {
        record.status = status;
        record.remarks = remarks || '';
        record.markedBy = req.user._id;
        record.role = req.user.role;
      } else {
        record = new Attendance({
          student: studentId,
          studentName: student.name,
          admissionNo: student.admissionNo,
          roomNumber: student.roomNumber,
          date: markingDate,
          status,
          remarks: remarks || '',
          markedBy: req.user._id,
          role: req.user.role
        });
      }
      await record.save();
      results.push(record);
    }

    res.json({ success: true, message: 'Attendance processed', count: results.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hostel Closed Days
exports.markHostelClosed = async (req, res) => {
  try {
    const { date, reason } = req.body;
    const closedDate = new Date(date);
    closedDate.setHours(0, 0, 0, 0);

    let closedDay = await HostelClosedDay.findOne({ date: closedDate });
    if (closedDay) {
      return res.status(400).json({ message: 'This date is already marked as closed.' });
    }

    closedDay = new HostelClosedDay({
      date: closedDate,
      reason: reason || 'Hostel Closed',
      markedBy: req.user._id
    });

    await closedDay.save();
    res.json({ success: true, message: 'Hostel marked as closed for this date', closedDay });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getHostelClosedDays = async (req, res) => {
  try {
    const closedDays = await HostelClosedDay.find().sort({ date: -1 }).limit(100);
    res.json({ success: true, closedDays });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteClosedDay = async (req, res) => {
  try {
    const { id } = req.params;
    await HostelClosedDay.findByIdAndDelete(id);
    res.json({ success: true, message: 'Closed day removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get students room - wise
exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student', isActive: true })
      .select('name roomNumber phone admissionNo semester collegeName hostelName userId email guardiansName guardiansPhone address department')
      .sort({ roomNumber: 1 });
    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get faculty
exports.getFaculty = async (req, res) => {
  try {
    const faculty = await User.find({ role: 'faculty' })
      .select('name department phone email designation roomNumber userId dob bloodGroup collegeName')
      .sort({ name: 1 });
    res.json({ success: true, faculty });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Dashboard Summary
exports.getSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [outgoings, homeGoings, activeMessCuts, pendingHomeGoings, pendingMessCuts] = await Promise.all([
      Outgoing.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      HomeGoing.countDocuments({ leaveDate: { $gte: today, $lt: tomorrow }, recordingType: 'recording' }),
      MessCut.countDocuments({ startDate: { $lte: new Date() }, endDate: { $gte: new Date() }, status: 'approved' }),
      HomeGoing.countDocuments({ status: 'pending', recordingType: 'request' }),
      MessCut.countDocuments({ status: 'pending' })
    ]);

    res.json({
      success: true,
      summary: {
        todayOutgoings: outgoings,
        todayHomeGoings: homeGoings,
        activeMessCuts,
        pendingHomeGoings,
        pendingMessCuts
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get reports
exports.getReports = async (req, res) => {
  try {
    const { month, year } = req.query;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendance = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('student', 'name roomNumber department userId').sort({ date: 1, roomNumber: 1 });

    res.json({ success: true, attendance });
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
    res.json({ success: true, message: 'Announcement published successfully', notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get all notifications
exports.getNotifications = async (req, res) => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const notifications = await Notification.find({ 
      sender: req.user._id,
      createdAt: { $gte: oneMonthAgo }
    })
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

// Get data for Mess Bill calculation
exports.getMessBillData = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ message: 'Month and year are required' });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const inmates = await User.find({ role: { $in: ['student', 'faculty'] }, isActive: true })
      .select('name roomNumber foodType nextFoodType nextFoodTypeEffectiveDate role');

    const now = new Date();
    // Sync any food type changes that are due
    for (let s of inmates) {
      if (s.nextFoodTypeEffectiveDate && now >= s.nextFoodTypeEffectiveDate) {
        s.foodType = s.nextFoodType;
        s.nextFoodType = undefined;
        s.nextFoodTypeEffectiveDate = undefined;
        await s.save();
      }
    }

    const attendance = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }, status: 'present'
    }).select('student');

    const messCuts = await MessCut.find({
      status: 'approved',
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    }).select('student startDate endDate');

    // Calculate present days per inmate
    const presentDays = {};
    attendance.forEach(a => {
      presentDays[a.student] = (presentDays[a.student] || 0) + 1;
    });

    // Calculate mess cut days per inmate within the month
    const messCutDays = {};
    messCuts.forEach(mc => {
      let cutStart = new Date(Math.max(startDate, new Date(mc.startDate)));
      let cutEnd = new Date(Math.min(endDate, new Date(mc.endDate)));
      let days = Math.floor((cutEnd - cutStart) / (1000 * 60 * 60 * 24)) + 1;
      if (days > 0) {
        messCutDays[mc.student] = (messCutDays[mc.student] || 0) + days;
      }
    });

    const data = inmates.map(s => {
      let pDays = presentDays[s._id] || 0;
      let mCuts = messCutDays[s._id] || 0;
      let mDays = Math.max(0, pDays - mCuts);
      return {
        _id: s._id,
        name: s.name,
        roomNumber: s.roomNumber,
        role: s.role,
        foodType: s.foodType || 'non-veg',
        presentDays: pDays,
        messCuts: mCuts,
        messDays: mDays,
        milkTakenDays: 0 
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
