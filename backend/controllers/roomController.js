const Room = require('../models/Room');
const User = require('../models/User');
const Waitlist = require('../models/Waitlist');

exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find().populate('occupants', 'name department admissionNo semester');
    res.json({ success: true, rooms });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addRoom = async (req, res) => {
  try {
    const { roomNo, type, capacity, block, floor, hostel } = req.body;
    const existingRoom = await Room.findOne({ roomNo });
    if (existingRoom) {
      return res.status(400).json({ message: 'Room already exists' });
    }
    const roomBlock = floor || block;
    const room = new Room({ roomNo, type, capacity, block: roomBlock, hostel });
    await room.save();
    res.status(201).json({ success: true, room });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.assignStudent = async (req, res) => {
  try {
    const { studentId, roomId } = req.body;
    const room = await Room.findById(roomId);
    const student = await User.findById(studentId);

    if (!room || !student) {
      return res.status(404).json({ message: 'Room or Student not found' });
    }

    if (room.occupants.length >= room.capacity) {
      return res.status(400).json({ message: 'Room is full' });
    }

    // Check if student already has a room
    if (student.roomId) {
      // Remove student from old room
      await Room.findByIdAndUpdate(student.roomId, {
        $pull: { occupants: studentId }
      });
    }

    room.occupants.push(studentId);
    await room.save();

    student.roomId = roomId;
    student.roomNumber = room.roomNo;
    await student.save();

    // Check if student was on waitlist
    await Waitlist.findOneAndUpdate({ student: studentId, status: 'pending' }, { status: 'allocated' });

    res.json({ success: true, message: 'Student assigned to room successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.vacateRoom = async (req, res) => {
  try {
    const { studentId } = req.body;
    const student = await User.findById(studentId);

    if (!student || !student.roomId) {
      return res.status(404).json({ message: 'Student not found or not assigned to any room' });
    }

    const roomId = student.roomId;
    await Room.findByIdAndUpdate(roomId, {
      $pull: { occupants: studentId }
    });

    student.roomId = undefined;
    student.roomNumber = undefined;
    await student.save();

    res.json({ success: true, message: 'Student vacated from room' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUnallocatedStudents = async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
      isActive: true,
      $or: [{ roomId: { $exists: false } }, { roomId: null }]
    }).select('name admissionNo department semester branch');
    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.autoAllocate = async (req, res) => {
  try {
    const { strategy, block, floor, hostel } = req.body;
    // strategy: 'same_dept', 'diff_dept', 'mixed'
    
    const unallocated = await User.find({
      role: 'student',
      isActive: true,
      $or: [{ roomId: { $exists: false } }, { roomId: null }]
    }).sort({ admissionNo: 1 });

    if (unallocated.length === 0) {
      return res.status(400).json({ message: 'No unallocated students found' });
    }

    const query = { status: 'available' };
    const filterVal = floor || block;
    if (filterVal) query.block = filterVal;
    if (hostel) query.hostel = hostel;
    let rooms = await Room.find(query);

    // Keep only rooms that are not full
    rooms = rooms.filter(r => r.occupants.length < r.capacity);

    // Sort rooms to fill rooms with most occupants first (partially filled rooms)
    rooms.sort((a, b) => b.occupants.length - a.occupants.length);

    let allocatedCount = 0;

    if (strategy === 'same_dept') {
      // Case 1: SAME Dept
      for (const room of rooms) {
        if (room.occupants.length < room.capacity) {
          const firstOccupantId = room.occupants[0];
          let deptMatch;
          if (firstOccupantId) {
            const firstOccupant = await User.findById(firstOccupantId);
            deptMatch = firstOccupant.department;
          }

          const availableSlots = room.capacity - room.occupants.length;
          let studentsToAssign;
          if (deptMatch) {
            studentsToAssign = unallocated.filter(s => s.department === deptMatch).slice(0, availableSlots);
          } else {
            // Pick first available student and their dept
            const firstStudent = unallocated[0];
            if (!firstStudent) break;
            deptMatch = firstStudent.department;
            studentsToAssign = unallocated.filter(s => s.department === deptMatch).slice(0, availableSlots);
          }

          for (const student of studentsToAssign) {
            room.occupants.push(student._id);
            student.roomId = room._id;
            student.roomNumber = room.roomNo;
            await student.save();
            allocatedCount++;
            // Remove from unallocated pool
            const idx = unallocated.findIndex(s => s._id.toString() === student._id.toString());
            unallocated.splice(idx, 1);
          }
          await room.save();
        }
      }
    } else if (strategy === 'diff_dept') {
      // Case 2: DIFFERENT Depts
      for (const room of rooms) {
        while (room.occupants.length < room.capacity) {
          // Get departments already in room
          const currentDepts = await Promise.all(room.occupants.map(async id => {
            const u = await User.findById(id);
            return u.department;
          }));

          const nextStudent = unallocated.find(s => !currentDepts.includes(s.department));
          if (!nextStudent) break;

          room.occupants.push(nextStudent._id);
          nextStudent.roomId = room._id;
          nextStudent.roomNumber = room.roomNo;
          await nextStudent.save();
          allocatedCount++;

          const idx = unallocated.findIndex(s => s._id.toString() === nextStudent._id.toString());
          unallocated.splice(idx, 1);
        }
        await room.save();
      }
    } else if (strategy === 'mixed') {
      // Case 3: Mixed (2 same + 2 different types) - logic simplified
      for (const room of rooms) {
         // Logic can be complex, simplified: fill 2 same dept, then remaining with different
         if (room.occupants.length === 0 && unallocated.length >= 2) {
             const dept = unallocated[0].department;
             const sameDept = unallocated.filter(s => s.department === dept).slice(0, 2);
             for(const s of sameDept) {
                room.occupants.push(s._id);
                s.roomId = room._id;
                s.roomNumber = room.roomNo;
                await s.save();
                allocatedCount++;
                const idx = unallocated.findIndex(u => u._id.toString() === s._id.toString());
                unallocated.splice(idx, 1);
             }
         }
         // Fill remaining with different depts
         while (room.occupants.length < room.capacity) {
            const currentDepts = await Promise.all(room.occupants.map(async id => {
                const u = await User.findById(id);
                return u.department;
            }));
            const nextStudent = unallocated.find(s => !currentDepts.includes(s.department));
            if (!nextStudent) break;
            room.occupants.push(nextStudent._id);
            nextStudent.roomId = room._id;
            nextStudent.roomNumber = room.roomNo;
            await nextStudent.save();
            allocatedCount++;
            const idx = unallocated.findIndex(u => u._id.toString() === nextStudent._id.toString());
            unallocated.splice(idx, 1);
         }
         await room.save();
      }
    }

    res.json({ success: true, message: `Auto-allocated ${allocatedCount} students`, allocatedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getWaitlist = async (req, res) => {
  try {
    const list = await Waitlist.find({ status: 'pending' }).populate('student', 'name admissionNo department');
    res.json({ success: true, waitlist: list });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addToWaitlist = async (req, res) => {
  try {
    const { studentId, priority } = req.body;
    const existing = await Waitlist.findOne({ student: studentId, status: 'pending' });
    if (existing) return res.status(400).json({ message: 'Student already on waitlist' });
    
    const entry = new Waitlist({ student: studentId, priority: priority || 0 });
    await entry.save();
    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllocationStats = async (req, res) => {
  try {
    const totalRooms = await Room.countDocuments();
    const rooms = await Room.find();
    let occupiedSlots = 0;
    let totalCapacity = 0;
    rooms.forEach(r => {
      occupiedSlots += r.occupants.length;
      totalCapacity += r.capacity;
    });

    res.json({
      success: true,
      stats: {
        totalRooms,
        totalCapacity,
        occupiedSlots,
        availableSlots: totalCapacity - occupiedSlots,
        unallocatedStudents: await User.countDocuments({ role: 'student', isActive: true, $or: [{ roomId: { $exists: false } }, { roomId: null }] })
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
