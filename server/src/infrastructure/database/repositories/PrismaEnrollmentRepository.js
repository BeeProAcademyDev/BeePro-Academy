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

  async update(id, data) {
    return this.prisma.enrollment.update({ where: { id }, data });
  }
}

module.exports = PrismaEnrollmentRepository;
