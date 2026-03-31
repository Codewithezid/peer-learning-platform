const express = require('express');
const { auth } = require('../../middleware/auth');
const learningController = require('../../controllers/learning.controller');

const router = express.Router();

router.get('/courses', auth, learningController.getCourses);
router.post('/courses', auth, learningController.createCourse);
router.get('/courses/:id', auth, learningController.getCourseById);
router.put('/courses/:id', auth, learningController.updateCourse);
router.delete('/courses/:id', auth, learningController.deleteCourse);
router.post('/courses/:id/resources', auth, learningController.addResource);
router.post('/courses/:id/enroll', auth, learningController.enrollInCourse);

router.put('/enrollments/:id/progress', auth, learningController.updateProgress);
router.get('/enrollments/me', auth, learningController.getMyEnrollments);

module.exports = router;
