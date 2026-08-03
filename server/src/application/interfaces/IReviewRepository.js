class IReviewRepository {
  async create(review) { throw new Error('Method not implemented') }
  async findById(id) { throw new Error('Method not implemented') }
  async findByCourseId(courseId, { skip, take }) { throw new Error('Method not implemented') }
  async findByUserId(userId, { skip, take }) { throw new Error('Method not implemented') }
  async findByUserAndCourse(userId, courseId) { throw new Error('Method not implemented') }
  async update(id, reviewData) { throw new Error('Method not implemented') }
  async delete(id) { throw new Error('Method not implemented') }
  async getCourseRatingStats(courseId) { throw new Error('Method not implemented') }
}

module.exports = IReviewRepository
