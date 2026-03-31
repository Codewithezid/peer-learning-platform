const express = require('express');
const { auth } = require('../../middleware/auth');
const skillsController = require('../../controllers/skills.controller');

const router = express.Router();

router.get('/skills', auth, skillsController.getSkills);
router.post('/skills', auth, skillsController.createSkill);
router.get('/skills/:id', auth, skillsController.getSkillById);

router.post('/user-skills', auth, skillsController.addUserSkill);
router.put('/user-skills/:id', auth, skillsController.updateUserSkill);
router.delete('/user-skills/:id', auth, skillsController.deleteUserSkill);
router.get('/user-skills/user/:userId', auth, skillsController.getUserSkills);

module.exports = router;
