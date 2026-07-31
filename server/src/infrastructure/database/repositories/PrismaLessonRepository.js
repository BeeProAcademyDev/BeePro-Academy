const ILessonRepository = require('../../../application/interfaces/ILessonRepository')

class PrismaLessonRepository extends ILessonRepository {
  constructor({ prisma }) {
    super()
    this.prisma = prisma
  }

  async findById(id) {
    return this.prisma.lesson.findUnique({
      where: { id },
      include: {
        files: true,
      }
    })
  }

  async findBySectionId(sectionId) {
    return this.prisma.lesson.findMany({
      where: { section_id: sectionId },
      orderBy: { order: 'asc' },
      include: {
        files: true,
      }
    })
  }

  async getMaxOrder(sectionId) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { section_id: sectionId },
      orderBy: { order: 'desc' }
    })
    return lesson ? lesson.order : 0
  }

  async countLessonsByCourse(courseId) {
    return this.prisma.lesson.count({
      where: {
        section: {
          course_id: courseId
        }
      }
    })
  }

  async create(data) {
    return this.prisma.lesson.create({ data })
  }

  async update(id, data) {
    return this.prisma.lesson.update({ where: { id }, data })
  }

  async delete(id) {
    return this.prisma.lesson.delete({ where: { id } })
  }

  async addFile(lessonId, data) {
    return this.prisma.lessonFile.create({
      data: {
        lesson_id: lessonId,
        ...data
      }
    })
  }

  async deleteFile(fileId) {
    return this.prisma.lessonFile.delete({
      where: { id: fileId }
    })
  }

  async getFileById(fileId) {
    return this.prisma.lessonFile.findUnique({
      where: { id: fileId }
    })
  }
}

module.exports = PrismaLessonRepository