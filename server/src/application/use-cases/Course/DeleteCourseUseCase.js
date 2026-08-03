const { NotFoundError, ForbiddenError } = require('../../../domain/errors/AppError')
const Course = require('../../../domain/entities/Course')

class DeleteCourseUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository
  }

  async execute({ courseId, userId, userRole }) {
    const existingCourse = await this.courseRepository.findById(courseId)
    if (!existingCourse) throw new NotFoundError('Course')

    const courseEntity = new Course({
      ...existingCourse,
      instructorId: existingCourse.instructor_id
    })

    if (!courseEntity.canBeDeletedBy(userId, userRole)) {
      throw new ForbiddenError('You can only delete your own courses')
    }

    await this.courseRepository.delete(courseId)
    return { success: true }
  }
}

module.exports = DeleteCourseUseCase
