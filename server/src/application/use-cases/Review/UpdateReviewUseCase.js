const Review = require('../../../domain/entities/Review')
const { ValidationError, NotFoundError, ForbiddenError } = require('../../../domain/errors/AppError')

class UpdateReviewUseCase {
  constructor({ reviewRepository, courseRepository }) {
    this.reviewRepository = reviewRepository
    this.courseRepository = courseRepository
  }

  async execute(id, userId, data) {
    const existingReview = await this.reviewRepository.findById(id)
    if (!existingReview) throw new NotFoundError('Review not found')

    if (existingReview.userId !== userId) {
      throw new ForbiddenError('You can only update your own reviews')
    }

    if (data.rating !== undefined) {
      const ratingValidation = Review.validateRating(data.rating)
      if (!ratingValidation.valid) throw new ValidationError(ratingValidation.message)
    }

    if (data.comment !== undefined) {
      const commentValidation = Review.validateComment(data.comment)
      if (!commentValidation.valid) throw new ValidationError(commentValidation.message)
    }

    const updatedReview = await this.reviewRepository.update(id, data)

    if (data.rating !== undefined) {
      const stats = await this.reviewRepository.getCourseRatingStats(updatedReview.courseId)
      await this.courseRepository.update(updatedReview.courseId, {
        average_rating: stats.averageRating,
        total_reviews: stats.totalReviews
      })
    }

    return updatedReview
  }
}

module.exports = UpdateReviewUseCase
