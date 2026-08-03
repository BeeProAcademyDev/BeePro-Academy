const { AppError, NotFoundError } = require('../../../domain/errors/AppError');

class GetCourseProgressUseCase {
  constructor({ enrollmentRepository, lessonProgressRepository }) {
    this.enrollmentRepository = enrollmentRepository;
    this.lessonProgressRepository = lessonProgressRepository;
  }

  async execute(userId, courseId) {
    const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);
    if (!enrollment) {
      throw new NotFoundError('Enrollment');
    }

    const lessonProgress = await this.lessonProgressRepository.findByUserAndCourse(userId, courseId);

    return {
      enrollment,
      lessonProgress
    };
  }
}

module.exports = GetCourseProgressUseCase;
