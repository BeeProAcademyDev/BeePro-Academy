const express = require('express')
const validators = require('../validators/assessmentValidators')

function createSubmissionRoutes(assessmentController, authenticate, authorize) {
  const router = express.Router()

  // STUDENT ROUTE (Get their own submission result)
  router.get(
    '/:submissionId',
    authenticate,
    assessmentController.getSubmissionResult
  )

  // INSTRUCTOR ROUTE (Review a student's submission)
  router.patch(
    '/:submissionId/review',
    authenticate,
    authorize('instructor', 'admin'),
    validators.validateReviewSubmission,
    assessmentController.reviewSubmission
  )

  return router
}

module.exports = createSubmissionRoutes