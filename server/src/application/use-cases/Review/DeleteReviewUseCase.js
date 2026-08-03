const { NotFoundError, ForbiddenError } = require('../../../domain/errors/AppError')

class DeleteReviewUseCase {
  constructor({ reviewRepository, courseRepository }) {
    this.reviewRepository = reviewRepository
    this.courseRepository = courseRepository
  }

  async execute(id, userId, userRole) {
    const existingReview = await this.reviewRepository.findById(id)
    if (!existingReview) throw new NotFoundError('Review not found')

    if (existingReview.userId !== userId && userRole !== 'admin') {
      throw new ForbiddenError('You can only delete your own reviews')
    }

    await this.reviewRepository.delete(id)

    const stats = await this.reviewRepository.getCourseRatingStats(existingReview.courseId)
    await this.courseRepository.update(existingReview.courseId, {
      average_rating: stats.averageRating,
      total_reviews: stats.totalReviews
    })
  }
}

module.exports = DeleteReviewUseCase
