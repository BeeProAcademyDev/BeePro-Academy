class GetCourseReviewsUseCase {
  constructor({ reviewRepository, courseRepository }) {
    this.reviewRepository = reviewRepository
    this.courseRepository = courseRepository
  }

  async execute(courseId, { page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit
    const result = await this.reviewRepository.findByCourseId(courseId, { skip, take: limit })
    
    return {
      reviews: result.reviews,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    }
  }
}

module.exports = GetCourseReviewsUseCase
