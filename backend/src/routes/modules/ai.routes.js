const express = require('express');
const { auth } = require('../../middleware/auth');
const { aiRateLimit } = require('../../middleware/rateLimit');
const aiController = require('../../controllers/ai.controller');

const router = express.Router();

// Existing endpoints
router.post('/ai/summarize', auth, aiRateLimit, aiController.summarize);
router.post('/ai/quiz/generate', auth, aiRateLimit, aiController.generateQuiz);
router.post('/ai/search', auth, aiRateLimit, aiController.intelligentSearch);
router.get('/ai/recommendations', auth, aiController.getRecommendations);
router.post('/ai/rag/ask', auth, aiRateLimit, aiController.askRepository);

// Architecture aliases from the provided document
router.post('/ai/summary', auth, aiRateLimit, aiController.summarize);
router.post('/ai/quiz', auth, aiRateLimit, aiController.generateQuiz);
router.post('/ai/recommend-resource', auth, aiRateLimit, aiController.getRecommendations);
router.post('/ai/recommend-peer', auth, aiRateLimit, aiController.getRecommendations);
router.post('/ai/ask', auth, aiRateLimit, aiController.askRepository);

module.exports = router;
