const Review = require('../../../domain/entities/Review')
const { ValidationError, NotFoundError } = require('../../../domain/errors/AppError')

class CreateReviewUseCase {
  constructor({ reviewRepository, courseRepository, enrollmentRepository }) {
    this.reviewRepository = reviewRepository
    this.courseRepository = courseRepository
    this.enrollmentRepository = enrollmentRepository
  }

  async execute(userId, courseId, data) {
    // 1. Validate data
    const ratingValidation = Review.validateRating(data.rating)
    if (!ratingValidation.valid) throw new ValidationError(ratingValidation.message)

    const commentValidation = Review.validateComment(data.comment)
    if (!commentValidation.valid) throw new ValidationError(commentValidation.message)

    // 2. Check if course exists
    const course = await this.courseRepository.findById(courseId)
    if (!course) throw new NotFoundError('Course not found')

    // 3. Check if user is enrolled
    const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId)
    if (!enrollment) throw new ValidationError('You must be enrolled to review this course')

    // 4. Check if review already exists
    const existingReview = await this.reviewRepository.findByUserAndCourse(userId, courseId)
    if (existingReview) throw new ValidationError('You have already reviewed this course')

    // 5. Create review
    const review = await this.reviewRepository.create({
      userId,
      courseId,
      rating: data.rating,
      comment: data.comment
    })

    // 6. Update course stats
    const stats = await this.reviewRepository.getCourseRatingStats(courseId)
    await this.courseRepository.update(courseId, {
      average_rating: stats.averageRating,
      total_reviews: stats.totalReviews
    })

    return review
  }
}

module.exports = CreateReviewUseCase
