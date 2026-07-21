const ICourseSectionRepository = require('../../../application/interfaces/ICourseSectionRepository')

class PrismaCourseSectionRepository extends ICourseSectionRepository {
  constructor({ prisma }) {
    super()
    this.prisma = prisma
  }

  async findById(id) {
    return this.prisma.courseSection.findUnique({
      where: { id },
      include: {
        lessons: {
          orderBy: { order: 'asc' }
        }
      }
    })
  }

  async findByCourseId(courseId) {
    return this.prisma.courseSection.findMany({
      where: { course_id: courseId },
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          orderBy: { order: 'asc' }
        }
      }
    })
  }

  

  async getMaxOrder(courseId) {
    const section = await this.prisma.courseSection.findFirst({
      where: { course_id: courseId },
      orderBy: { order: 'desc' }
    })
    return section ? section.order : 0
  }

  async create(data) {
    return this.prisma.courseSection.create({ data })
  }

  async update(id, data) {
    return this.prisma.courseSection.update({ where: { id }, data })
  }

  async delete(id) {
    return this.prisma.courseSection.delete({ where: { id } })
  }
}

module.exports = PrismaCourseSectionRepository
