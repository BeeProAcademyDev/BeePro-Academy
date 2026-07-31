const ILessonProgressRepository = require('../../../application/interfaces/ILessonProgressRepository');

class PrismaLessonProgressRepository extends ILessonProgressRepository {
  constructor({ prisma }) {
    super();
    this.prisma = prisma;
  }

  async create(data) {
    return this.prisma.lessonProgress.create({ data });
  }

  async findById(id) {
    return this.prisma.lessonProgress.findUnique({ where: { id } });
  }

  async findByUserAndLesson(userId, lessonId) {
    return this.prisma.lessonProgress.findUnique({
      where: {
        user_id_lesson_id: {
          user_id: userId,
          lesson_id: lessonId,
        },
      },
    });
  }

  async findByUserAndCourse(userId, courseId) {
    return this.prisma.lessonProgress.findMany({
      where: {
        user_id: userId,
        course_id: courseId,
      },
    });
  }

  async update(id, data) {
    return this.prisma.lessonProgress.update({ where: { id }, data });
  }
}

module.exports = PrismaLessonProgressRepository;
