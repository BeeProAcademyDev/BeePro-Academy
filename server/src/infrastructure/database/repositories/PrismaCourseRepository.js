const ICourseRepository = require('../../../application/interfaces/ICourseRepository')

class PrismaCourseRepository extends ICourseRepository {
  constructor({ prisma }) {
    super()
    this.prisma = prisma
  }

  async findById(id) {
    return this.prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_url: true,
          }
        }
      }
    })
  }

  async findAll({ page = 1, limit = 20, status, categoryId, search, instructorId } = {}) {
    const where = {}
    
    if (status) where.status = status
    if (categoryId) where.category_id = categoryId
    if (instructorId) where.instructor_id = instructorId
    if (search) {
      where.title = { contains: search, mode: 'insensitive' }
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          instructor: {
            select: {
              id: true,
              full_name: true,
            }
          }
        }
      }),
      this.prisma.course.count({ where }),
    ])

    return { courses, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async create(data) {
    return this.prisma.course.create({ data })
  }

  async update(id, data) {
    return this.prisma.course.update({ where: { id }, data })
  }

  async delete(id) {
    return this.prisma.course.delete({ where: { id } })
  }

  async recalculateTotalDuration(courseId) {
    const result = await this.prisma.lesson.aggregate({
      where: {
        section: {
          course_id: courseId
        }
      },
      _sum: {
        duration: true
      }
    })
    const totalDuration = result._sum.duration || 0
    await this.prisma.course.update({
      where: { id: courseId },
      data: { total_duration: totalDuration }
    })
    return totalDuration
  }

  async countAll() {
    return this.prisma.course.count()
  }

  async countPendingApproval() {
    return this.prisma.course.count({
      where: {
        admin_approval_status: 'pending'
      }
    })
  }

  async countByInstructor(instructorId) {
    return this.prisma.course.count({
      where: { instructor_id: instructorId }
    })
  }

  async countPublishedByInstructor(instructorId) {
    return this.prisma.course.count({
      where: {
        instructor_id: instructorId,
        status: 'published',
        admin_approval_status: 'approved'
      }
    })
  }

  async countDraftsByInstructor(instructorId) {
    return this.prisma.course.count({
      where: {
        instructor_id: instructorId,
        status: 'draft'
      }
    })
  }

  async countPendingApprovalByInstructor(instructorId) {
    return this.prisma.course.count({
      where: {
        instructor_id: instructorId,
        admin_approval_status: 'pending'
      }
    })
  }

  async GetMyTotalCourses(instructor_id) {
    return this.countByInstructor(instructor_id)
  }

  async GetMyPublishedCourses(instructorId) {
    return this.countPublishedByInstructor(instructorId)
  }

  async GetMyTotalDraftCourses(instructorId) {
    return this.countDraftsByInstructor(instructorId)
  }

  async GetMyTotalAdminPendingCourses(instructorId) {
    return this.countPendingApprovalByInstructor(instructorId)
  }
}

module.exports = PrismaCourseRepository