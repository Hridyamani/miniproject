const User = require('../models/User');
const Attendance = require('../models/Attendance');
const MessCut = require('../models/MessCut');
const HomeGoing = require('../models/HomeGoing');
const Outgoing = require('../models/Outgoing');
const Notification = require('../models/Notification');
const HostelClosedDay = require('../models/HostelClosedDay');
const HostelClosing = require('../models/HostelClosing');
const MessInventory = require('../models/MessInventory');


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
        title: 'Home Going Request Status',
        message: `Your home going request for ${record.leaveDate.toLocaleDateString()} has been ${status}${remarks ? '. Remarks: ' + remarks : ''}.`,
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
        title: 'Mess Cut Request Status',
        message: `Your mess cut request from ${record.startDate.toLocaleDateString()} has been ${status}${remarks ? '. Remarks: ' + remarks : ''}.`,
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

    // Check if hostel is closed on the date
    const isClosed = await HostelClosing.findOne({
      startDate: { $lte: markingDate },
      endDate: { $gte: markingDate }
    });

    if (isClosed) {
      return res.status(400).json({ success: false, message: `Hostel is closed from ${isClosed.startDate.toDateString()} to ${isClosed.endDate.toDateString()}. Attendance cannot be marked.` });
    }

    const results = [];
    for (const item of attendance) {
      const { student: studentId, status, milkTaken, remarks } = item;
      const student = await User.findById(studentId);
      if (!student) continue;

      let record = await Attendance.findOne({ student: studentId, date: markingDate });

      if (record) {
        record.status = status;
        record.milkTaken = (status === 'present') ? !!milkTaken : false;
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
          milkTaken: (status === 'present') ? !!milkTaken : false,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const facultyList = await User.find({ role: 'faculty' })
      .select('name department phone email designation roomNumber userId dob bloodGroup collegeName')
      .sort({ name: 1 });

    const attendanceRecords = await Attendance.find({
      date: today,
      student: { $in: facultyList.map(f => f._id) }
    });

    const results = facultyList.map(f => {
      const att = attendanceRecords.find(a => a.student.toString() === f._id.toString());
      return {
        ...f._doc,
        status: att ? att.status : null,
        markedTime: att ? att.createdAt : null
      };
    });

    res.json({ success: true, faculty: results });
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
    let pdfUrl = null;
    if (req.file) {
      pdfUrl = `/uploads/${req.file.filename}`;
    }

    const notification = new Notification({
      title,
      message,
      targetRole: targetRole || 'all',
      type: type || 'general',
      sender: req.user._id,
      pdfUrl
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
      date: { $gte: startDate, $lte: endDate }
    }).select('student status milkTaken date');

    const messCuts = await MessCut.find({
      status: 'approved',
      $or: [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }]
    }).select('student startDate endDate');

    // Build per-person attendance stats AND a Set of present date strings for overlap checks
    const attendanceStats = {}; // { studentId: { present, milk } }
    const presentDatesMap = {}; // { studentId: Set<'YYYY-MM-DD'> }

    attendance.forEach(a => {
      const sid = a.student.toString();
      if (!attendanceStats[sid]) attendanceStats[sid] = { present: 0, milk: 0 };
      if (a.status === 'present') {
        attendanceStats[sid].present++;
        if (a.milkTaken) attendanceStats[sid].milk++;
        // Record this exact date so mess cut overlap can be checked
        if (!presentDatesMap[sid]) presentDatesMap[sid] = new Set();
        presentDatesMap[sid].add(new Date(a.date).toISOString().split('T')[0]);
      }
    });

    // Calculate effective mess cut days per inmate:
    // ONLY deduct a mess cut day if the person was actually PRESENT on that day.
    // If they were absent, they didn't eat from the mess — no deduction needed.
    const effectiveMessCutDays = {}; // mess cut days that actually overlap with present days
    const rawMessCutDays = {};       // total mess cut days in the month (for display only)

    messCuts.forEach(mc => {
      const sid = mc.student.toString();
      const presentDates = presentDatesMap[sid] || new Set();

      // Clip the mess cut range to the billing month
      let cursor = new Date(Math.max(startDate.getTime(), new Date(mc.startDate).getTime()));
      const cutEnd = new Date(Math.min(endDate.getTime(), new Date(mc.endDate).getTime()));
      cursor.setHours(0, 0, 0, 0);
      cutEnd.setHours(0, 0, 0, 0);

      let rawDays = 0;
      while (cursor <= cutEnd) {
        rawDays++;
        const dateStr = cursor.toISOString().split('T')[0];
        if (presentDates.has(dateStr)) {
          // Person was present on this mess cut day → deduct from billing
          effectiveMessCutDays[sid] = (effectiveMessCutDays[sid] || 0) + 1;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      rawMessCutDays[sid] = (rawMessCutDays[sid] || 0) + rawDays;
    });

    const data = inmates.map(s => {
      const sid = s._id.toString();
      const stats = attendanceStats[sid] || { present: 0, milk: 0 };
      const pDays = stats.present;
      const mCutsRaw = rawMessCutDays[sid] || 0;          // total mess cut days in month
      const mCutsEffective = effectiveMessCutDays[sid] || 0; // only those on present days
      const mDays = Math.max(0, pDays - mCutsEffective);   // billed mess days
      return {
        _id: s._id,
        name: s.name,
        roomNumber: s.roomNumber,
        role: s.role,
        foodType: s.foodType || 'non-veg',
        presentDays: pDays,
        messCuts: mCutsRaw,           // displayed as total approved mess cut days
        effectiveMessCuts: mCutsEffective, // how many were actually deducted
        messDays: mDays,
        milkTakenDays: stats.milk
      };
    });

    // Get Left-Out Logic
    const currMonth = parseInt(month);
    const currYear = parseInt(year);

    // Calculate Previous Month
    let prevMonth = currMonth - 1;
    let prevYear = currYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = currYear - 1;
    }

    const [prevInventory, currentInventory] = await Promise.all([
      MessInventory.findOne({ month: prevMonth, year: prevYear }),
      MessInventory.findOne({ month: currMonth, year: currYear })
    ]);

    res.json({ 
      success: true, 
      data, 
      previousLeftOut: prevInventory ? prevInventory.leftOutAmount : 0,
      currentLeftOut: currentInventory ? currentInventory.leftOutAmount : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.saveMessInventory = async (req, res) => {
  try {
    const { month, year, leftOutAmount } = req.body;
    if (!month || !year || leftOutAmount === undefined) {
      return res.status(400).json({ message: 'Month, year and amount are required' });
    }

    const inventory = await MessInventory.findOneAndUpdate(
      { month: parseInt(month), year: parseInt(year) },
      { leftOutAmount: parseFloat(leftOutAmount), updatedBy: req.user._id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: 'Monthly inventory updated successfully', inventory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
