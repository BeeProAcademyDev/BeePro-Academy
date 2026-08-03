const express = require('express');
const validate = require('../middlewares/validate');
const { updateLessonProgressSchema } = require('../validators/progressValidators');

function createProgressRoutes(progressController, authenticate) {
  const router = express.Router();

  // All progress routes require authentication
  router.use(authenticate);

  // Enroll in a course
  router.post('/enroll/:courseId', progressController.enrollInCourse);

  // Get user's enrollments
  router.get('/enrollments', progressController.getEnrollments);

  // Get course progress (enrollment + lesson progress)
  router.get('/course/:courseId', progressController.getCourseProgress);

  // Update lesson progress
  router.put(
    '/lesson/:lessonId',
    validate(updateLessonProgressSchema),
    progressController.updateLessonProgress
  );

  return router;
}

module.exports = createProgressRoutes;
