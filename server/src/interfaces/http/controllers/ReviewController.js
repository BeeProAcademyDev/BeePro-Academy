class ReviewController {
  constructor({ createReviewUseCase, getCourseReviewsUseCase, updateReviewUseCase, deleteReviewUseCase }) {
    this.createReviewUseCase = createReviewUseCase
    this.getCourseReviewsUseCase = getCourseReviewsUseCase
    this.updateReviewUseCase = updateReviewUseCase
    this.deleteReviewUseCase = deleteReviewUseCase
  }

  createReview = async (req, res, next) => {
    try {
      const review = await this.createReviewUseCase.execute(
        req.user.id,
        req.params.courseId,
        req.body
      )
      res.status(201).json({ status: 'success', data: review })
    } catch (error) {
      next(error)
    }
  }

  getCourseReviews = async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10
      const result = await this.getCourseReviewsUseCase.execute(req.params.courseId, { page, limit })
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  updateReview = async (req, res, next) => {
    try {
      const review = await this.updateReviewUseCase.execute(
        req.params.id,
        req.user.id,
        req.body
      )
      res.status(200).json({ status: 'success', data: review })
    } catch (error) {
      next(error)
    }
  }

  deleteReview = async (req, res, next) => {
    try {
      await this.deleteReviewUseCase.execute(
        req.params.id,
        req.user.id,
        req.user.role
      )
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  }
}

module.exports = ReviewController
