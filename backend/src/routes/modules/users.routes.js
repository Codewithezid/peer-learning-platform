const express = require('express');
const { auth } = require('../../middleware/auth');
const usersController = require('../../controllers/users.controller');

const router = express.Router();

router.get('/users', auth, usersController.getUsers);
router.get('/users/:id', auth, usersController.getUserById);
router.get('/users/:id/activity', auth, usersController.getUserActivity);

module.exports = router;
