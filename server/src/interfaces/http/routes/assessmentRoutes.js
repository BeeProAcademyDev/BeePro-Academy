const express = require('express')
const validators = require('../validators/assessmentValidators')

function createAssesmentRoutes(assessmentController, authenticate, authorize) {
  const router = express.Router({ mergeParams: true })

  // mergeParams: true allows us to mount this router on paths with parameters like:
  // /api/v1/courses/:courseId/assessments

  // INSTRUCTOR ROUTES
  // add assesment
  router.post(
    '/',
    authenticate,
    authorize('instructor', 'admin'),
    validators.validateCreateAssessment,
    assessmentController.create
  )

  // update assesment
  router.patch(
    '/:assessmentId',
    authenticate,
    authorize('instructor', 'admin'),
    validators.validateUpdateAssessment,
    assessmentController.update
  )

  // Get all submissions for an assessment
  router.get(
    '/:assessmentId/submissions',
    authenticate,
    authorize('instructor', 'admin'),
    assessmentController.getSubmissions
  )

  // Get specific submission details for review
  router.get(
    '/:assessmentId/submissions/:submissionId',
    authenticate,
    authorize('instructor', 'admin'),
    assessmentController.getSubmissionForReview
  )

  // Review Assessment Submission for Instructor
  router.patch(
    '/:assessmentId/submissions/:submissionId/review',
    authenticate,
    authorize('instructor', 'admin'),
    validators.validateReviewSubmission,
    assessmentController.reviewSubmission
  )


  // delete assessment
  router.delete(
    '/:assessmentId',
    authenticate,
    authorize('instructor', 'admin'),
    assessmentController.deleteAssessment
  )

  // add Question
  router.post(
    '/:assessmentId/questions',
    authenticate,
    authorize('instructor', 'admin'),
    validators.validateAddQuestion,
    assessmentController.addQuestion
  )

  // update question
  router.patch(
    '/:assessmentId/questions/:questionId',
    authenticate,
    authorize('instructor', 'admin'),
    assessmentController.updateQuestion
  )

  // delete question
  router.delete(
    '/:assessmentId/questions/:questionId',
    authenticate,
    authorize('instructor', 'admin'),
    assessmentController.deleteQuestion
  )

  // STUDENT ROUTES
  router.get(
    '/:assessmentId',
    authenticate,
    assessmentController.getDetails
  )

  router.post(
    '/:assessmentId/start',
    authenticate,
    assessmentController.startSession
  )

  router.post(
    '/:assessmentId/submit',
    authenticate,
    validators.validateSubmitAssessment,
    assessmentController.submitSession
  )

  return router
}

module.exports=createAssesmentRoutes
