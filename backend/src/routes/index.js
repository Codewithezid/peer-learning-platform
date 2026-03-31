const express = require('express');

const authRoutes = require('./modules/auth.routes');
const usersRoutes = require('./modules/users.routes');
const skillsRoutes = require('./modules/skills.routes');
const learningRoutes = require('./modules/learning.routes');
const resourcesRoutes = require('./modules/resources.routes');
const chatRoutes = require('./modules/chat.routes');
const aiRoutes = require('./modules/ai.routes');
const peerRoutes = require('./modules/peer.routes');
const feedbackRoutes = require('./modules/feedback.routes');
const analyticsRoutes = require('./modules/analytics.routes');
const adminRoutes = require('./modules/admin.routes');
const quizzesRoutes = require('./modules/quizzes.routes');
const uploadsRoutes = require('./modules/uploads.routes');

const router = express.Router();

// Core platform modules
router.use(authRoutes);
router.use(usersRoutes);
router.use(skillsRoutes);
router.use(learningRoutes);
router.use(resourcesRoutes);
router.use(chatRoutes);
router.use(aiRoutes);
router.use(peerRoutes);
router.use(feedbackRoutes);
router.use(analyticsRoutes);
router.use(adminRoutes);
router.use(quizzesRoutes);
router.use(uploadsRoutes);

module.exports = router;
