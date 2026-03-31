const express = require('express');
const { auth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/requireAdmin');
const adminController = require('../../controllers/admin.controller');

const router = express.Router();

router.get('/admin/access', auth, requireAdmin, adminController.checkAccess);
router.get('/admin/dashboard', auth, requireAdmin, adminController.getDashboard);
router.get('/admin/users', auth, requireAdmin, adminController.getUsers);
router.get('/admin/resources', auth, requireAdmin, adminController.getResources);
router.get('/admin/sessions', auth, requireAdmin, adminController.getSessions);
router.get('/admin/ai-usage', auth, requireAdmin, adminController.getAIUsage);
router.get('/admin/reports', auth, requireAdmin, adminController.getReports);

module.exports = router;
