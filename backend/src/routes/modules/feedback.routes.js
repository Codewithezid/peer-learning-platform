const express = require('express');
const { auth } = require('../../middleware/auth');
const feedbackController = require('../../controllers/feedback.controller');

const router = express.Router();

router.post('/feedback', auth, feedbackController.createFeedback);
router.get('/feedback/session/:id', auth, feedbackController.getSessionFeedback);
router.get('/ratings/user/:id', auth, feedbackController.getUserRatings);

module.exports = router;
