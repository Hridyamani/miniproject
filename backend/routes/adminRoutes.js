const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', ctrl.getDashboardStats);
router.get('/users', ctrl.getAllUsers);
router.post('/users/create', ctrl.createUser);
router.put('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);
router.get('/return-tracking', ctrl.getReturnTracking);
router.put('/security-settings', ctrl.updateSecuritySettings);
router.get('/hostel-settings', ctrl.getHostelSettings);
router.post('/transfer-admin', ctrl.transferAdmin);
router.post('/publish-notification', ctrl.publishNotification);
router.get('/notifications', ctrl.getNotifications);
router.delete('/notifications/:id', ctrl.deleteNotification);

// Attendance & Closing
router.get('/attendance', ctrl.getAttendanceReport);
router.get('/hostel-closing', ctrl.getHostelClosingHistory);
router.post('/hostel-closing', ctrl.markHostelClosing);
router.delete('/hostel-closing/:id', ctrl.deleteHostelClosing);

// Archive
router.post('/users/:id/archive', ctrl.archiveUser);
router.get('/archives', ctrl.getArchives);
router.delete('/archives/:id', ctrl.deleteArchive);

module.exports = router;
