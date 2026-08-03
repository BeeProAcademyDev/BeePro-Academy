const { Router } = require('express')
const validate = require('../middlewares/validate')
const { createReviewSchema, updateReviewSchema } = require('../validators/reviewValidators')

function createReviewRoutes(reviewController, authenticate) {
  const router = Router({ mergeParams: true })

  // GET /api/v1/courses/:courseId/reviews (Public)
  router.get('/', reviewController.getCourseReviews)

  // Protected routes
  router.use(authenticate)

  // POST /api/v1/courses/:courseId/reviews
  router.post('/', validate(createReviewSchema), reviewController.createReview)

  // PATCH /api/v1/reviews/:id
  router.patch('/:id', validate(updateReviewSchema), reviewController.updateReview)

  // DELETE /api/v1/reviews/:id
  router.delete('/:id', reviewController.deleteReview)

  return router
}

module.exports = createReviewRoutes
