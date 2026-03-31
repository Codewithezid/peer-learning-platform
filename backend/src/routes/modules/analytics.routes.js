const express = require('express');
const { auth } = require('../../middleware/auth');
const analyticsController = require('../../controllers/analytics.controller');

const router = express.Router();

router.get('/analytics/dashboard', auth, analyticsController.getDashboard);
router.get('/analytics/scores', auth, analyticsController.getScores);
router.get('/analytics/leaderboard', auth, analyticsController.getLeaderboard);

module.exports = router;
