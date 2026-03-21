const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('student'));

router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.put('/food-preference', ctrl.updateFoodPreference);


router.get('/attendance', ctrl.getAttendance);

router.get('/outgoing', ctrl.getOutgoings);
router.post('/outgoing', ctrl.markOutgoing);

router.get('/home-going', ctrl.getHomeGoings);
router.post('/home-going/request', ctrl.requestHomeGoing);
router.post('/home-going/mark', ctrl.markHomeGoing);

router.get('/mess-cut', ctrl.getMessCuts);
router.post('/mess-cut', ctrl.requestMessCut);

router.post('/return', ctrl.markReturn);
router.get('/notifications', ctrl.getNotifications);

module.exports = router;
