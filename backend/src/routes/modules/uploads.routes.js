const express = require('express');
const { auth } = require('../../middleware/auth');
const { uploadAvatar, uploadResourceFile } = require('../../controllers/uploads.controller');
const { uploadAvatar: avatarMiddleware, uploadResourceFile: resourceMiddleware } = require('../../middleware/upload');

const router = express.Router();

router.post('/uploads/avatar', auth, avatarMiddleware, uploadAvatar);
router.post('/uploads/resource', auth, resourceMiddleware, uploadResourceFile);

module.exports = router;
