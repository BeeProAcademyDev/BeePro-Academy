const { AppError, NotFoundError } = require('../../../domain/errors/AppError');

class EnrollInCourseUseCase {
  constructor({ enrollmentRepository, courseRepository, lessonRepository }) {
    this.enrollmentRepository = enrollmentRepository;
    this.courseRepository = courseRepository;
    this.lessonRepository = lessonRepository;
  }

  async execute(userId, courseId) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course');
    }

    const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);
    if (existingEnrollment) {
      throw new AppError('User is already enrolled in this course', 400, 'BAD_REQUEST');
    }

    const totalLessons = await this.lessonRepository.countLessonsByCourse(courseId);

    const enrollment = await this.enrollmentRepository.create({
      user_id: userId,
      course_id: courseId,
      progress: 0,
      total_lessons: totalLessons,
      completed_lessons: 0,
      last_accessed_at: new Date(),
    });

    return enrollment;
  }
}

module.exports = EnrollInCourseUseCase;
