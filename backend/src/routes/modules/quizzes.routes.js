const express = require('express');
const { auth } = require('../../middleware/auth');
const quizzesController = require('../../controllers/quizzes.controller');

const router = express.Router();

router.get('/quizzes', auth, quizzesController.getQuizzes);
router.get('/quizzes/me/attempts', auth, quizzesController.getMyAttempts);
router.get('/quizzes/:id', auth, quizzesController.getQuizById);
router.post('/quizzes/:id/attempt', auth, quizzesController.submitAttempt);

module.exports = router;
