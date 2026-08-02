const IMeetingRepository = require('../../../application/interfaces/IMeetingRepository')

class PrismaMeetingRepository extends IMeetingRepository {
  constructor({ prisma }) {
    super()
    this.prisma = prisma
  }

  async create(data) {
    return this.prisma.meeting.create({ data })
  }

  async findById(id) {
    return this.prisma.meeting.findUnique({
      where: { id },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    instructor_id: true
                  }
                }
              }
            }
          }
        },
        instructor: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true
          }
        }
      }
    })
  }

  async findByLessonId(lessonId) {
    return this.prisma.meeting.findUnique({
      where: { lesson_id: lessonId },
      include: {
        instructor: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true
          }
        }
      }
    })
  }

  async findUpcomingByInstructorId(instructorId) {
    return this.prisma.meeting.findMany({
      where: {
        instructor_id: instructorId,
        status: { in: ['scheduled', 'in_progress'] },
        scheduled_at: { gte: new Date() }
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            section: {
              select: {
                course: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { scheduled_at: 'asc' }
    })
  }

  async update(id, data) {
    return this.prisma.meeting.update({ where: { id }, data })
  }

  async delete(id) {
    return this.prisma.meeting.delete({ where: { id } })
  }
}

module.exports = PrismaMeetingRepository
