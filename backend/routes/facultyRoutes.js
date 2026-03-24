const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/facultyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('faculty'));

router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.put('/food-preference', ctrl.updateFoodPreference);


router.post('/attendance', ctrl.markSelfAttendance);
router.get('/attendance', ctrl.getSelfAttendanceHistory);


router.post('/mess-cut', ctrl.requestMessCut);
router.get('/mess-cut', ctrl.getSelfMessCuts);

router.post('/home-going', ctrl.markHomeGoing);
router.put('/home-going/:id/return', ctrl.markHomeGoingReturn);
router.get('/home-going', ctrl.getSelfHomeGoings);

router.get('/notifications', ctrl.getNotifications);

module.exports = router;
