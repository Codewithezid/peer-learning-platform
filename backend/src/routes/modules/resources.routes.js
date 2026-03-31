const express = require('express');
const { auth } = require('../../middleware/auth');
const knowledgeController = require('../../controllers/knowledge.controller');

const router = express.Router();

// Legacy article endpoints (kept for existing frontend compatibility)
router.get('/articles', auth, knowledgeController.getArticles);
router.post('/articles', auth, knowledgeController.createArticle);
router.get('/articles/search', auth, knowledgeController.searchArticles);
router.get('/articles/:id', auth, knowledgeController.getArticleById);
router.put('/articles/:id', auth, knowledgeController.updateArticle);
router.delete('/articles/:id', auth, knowledgeController.deleteArticle);

// Architecture-aligned repository endpoints
router.get('/resources', auth, knowledgeController.getArticles);
router.post('/resources', auth, knowledgeController.createArticle);
router.get('/resources/search', auth, knowledgeController.searchArticles);
router.get('/resources/:id', auth, knowledgeController.getArticleById);
router.put('/resources/:id', auth, knowledgeController.updateArticle);
router.delete('/resources/:id', auth, knowledgeController.deleteArticle);

module.exports = router;
