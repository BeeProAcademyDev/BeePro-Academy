const { NotFoundError, ForbiddenError } = require('../../../domain/errors/AppError')
const Course = require('../../../domain/entities/Course')

class GetCourseByIdUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository
  }

  async execute({ courseId, userId, userRole }) {
    const course = await this.courseRepository.findById(courseId)
    if (!course) throw new NotFoundError('Course')

    const courseEntity = new Course({
      ...course,
      instructorId: course.instructor_id
    })

    // If it's a student (or unauthenticated), they can only view published courses
    if (userRole === 'student' || !userRole) {
      if (!courseEntity.isPublished()) {
        throw new ForbiddenError('This course is not published')
      }
    } else if (userRole === 'instructor') {
      // If it's an instructor, they can view their own draft/archived courses, 
      // but they can only view OTHER instructors' courses if they are published.
      if (!courseEntity.isPublished() && courseEntity.instructorId !== userId) {
        throw new ForbiddenError('You can only view drafts of your own courses')
      }
    }

    return course
  }
}

module.exports = GetCourseByIdUseCase
