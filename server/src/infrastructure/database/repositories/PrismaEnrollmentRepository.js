const IEnrollmentRepository = require('../../../application/interfaces/IEnrollmentRepository');

class PrismaEnrollmentRepository extends IEnrollmentRepository {
  constructor({ prisma }) {
    super();
    this.prisma = prisma;
  }

  async create(data) {
    return this.prisma.enrollment.create({ data });
  }

  async findById(id) {
    return this.prisma.enrollment.findUnique({ where: { id } });
  }

  async findByUserAndCourse(userId, courseId) {
    return this.prisma.enrollment.findUnique({
      where: {
        user_id_course_id: {
          user_id: userId,
          course_id: courseId,
        },
      },
    });
  }

  async findByUserId(userId) {
    return this.prisma.enrollment.findMany({
      where: { user_id: userId },
      include: {
        course: {
          include: {
            instructor: {
              select: { full_name: true, avatar_url: true }
            }
          }
        }
      }
    });
  }

  async getStudentEnrollmentCount(userId) {
    return this.prisma.enrollment.count({
      where: { user_id: userId }
    });
  }

  async findByCourseId(courseId) {
    return this.prisma.enrollment.findMany({
      where: { course_id: courseId }
    });
  }

  async update(id, data) {
    return this.prisma.enrollment.update({ where: { id }, data });
  }

  async userCompletedCoursesCount(id) {
    return this.prisma.enrollment.count({
      where: {
        user_id: id,
        progress: 100,
      },
    });
  }

  async getStudentAverageProgress(userId) {
    const result = await this.prisma.enrollment.aggregate({
      where: {
        user_id: userId,
      },
      _avg: {
        progress: true,
      },
    });

    return result._avg.progress ?? 0;
  }

  async countDistinctStudentsByInstructor(instructorId) {
    const records = await this.prisma.enrollment.findMany({
      where: {
        course: { instructor_id: instructorId }
      },
      select: { user_id: true },
      distinct: ['user_id']
    });
    return records.length;
  }
}

module.exports = PrismaEnrollmentRepository;
