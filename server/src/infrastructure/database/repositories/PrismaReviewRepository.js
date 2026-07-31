const IReviewRepository = require('../../../application/interfaces/IReviewRepository')
const Review = require('../../../domain/entities/Review')

class PrismaReviewRepository extends IReviewRepository {
  constructor(prisma) {
    super()
    this.prisma = prisma
  }

  _toEntity(record) {
    if (!record) return null
    return new Review({
      id: record.id,
      course_id: record.course_id,
      user_id: record.user_id,
      rating: record.rating,
      comment: record.comment,
      created_at: record.created_at,
      updated_at: record.updated_at,
      user: record.user ? {
        id: record.user.id,
        full_name: record.user.full_name,
        avatar_url: record.user.avatar_url
      } : undefined
    })
  }

  async create(reviewData) {
    const record = await this.prisma.review.create({
      data: {
        user_id: reviewData.userId,
        course_id: reviewData.courseId,
        rating: reviewData.rating,
        comment: reviewData.comment
      }
    })
    return this._toEntity(record)
  }

  async findById(id) {
    const record = await this.prisma.review.findUnique({
      where: { id }
    })
    return this._toEntity(record)
  }

  async findByCourseId(courseId, { skip = 0, take = 10 } = {}) {
    const [records, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { course_id: courseId },
        include: {
          user: {
            select: { id: true, full_name: true, avatar_url: true }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take
      }),
      this.prisma.review.count({ where: { course_id: courseId } })
    ])
    
    return {
      reviews: records.map(this._toEntity),
      total
    }
  }

  async findByUserId(userId, { skip = 0, take = 10 } = {}) {
    const [records, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { user_id: userId },
        include: {
          course: {
            select: { id: true, title: true }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take
      }),
      this.prisma.review.count({ where: { user_id: userId } })
    ])
    
    return {
      reviews: records.map(this._toEntity), // Course is not strictly typed in Review entity yet, but we return it
      total
    }
  }

  async findByUserAndCourse(userId, courseId) {
    const record = await this.prisma.review.findUnique({
      where: {
        user_id_course_id: {
          user_id: userId,
          course_id: courseId
        }
      }
    })
    return this._toEntity(record)
  }

  async update(id, reviewData) {
    const record = await this.prisma.review.update({
      where: { id },
      data: {
        rating: reviewData.rating,
        comment: reviewData.comment
      }
    })
    return this._toEntity(record)
  }

  async delete(id) {
    await this.prisma.review.delete({
      where: { id }
    })
  }

  async getCourseRatingStats(courseId) {
    const stats = await this.prisma.review.aggregate({
      where: { course_id: courseId },
      _avg: { rating: true },
      _count: { rating: true }
    })
    
    return {
      averageRating: stats._avg.rating ? Number(stats._avg.rating) : 0,
      totalReviews: stats._count.rating
    }
  }
}

module.exports = PrismaReviewRepository
