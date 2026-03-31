const express = require('express');
const { auth } = require('../../middleware/auth');
const authController = require('../../controllers/auth.controller');

const router = express.Router();

router.get('/auth/me', auth, authController.getMe);
router.put('/auth/profile', auth, authController.updateProfile);

module.exports = router;
