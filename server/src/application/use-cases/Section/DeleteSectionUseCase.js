const { ValidationError, NotFoundError, ForbiddenError } = require('../../../domain/errors/AppError')
const CourseSection = require('../../../domain/entities/CourseSection')
const Course = require('../../../domain/entities/Course')

class DeleteSectionUseCase {
  constructor({ sectionRepository, courseRepository }) {
    this.sectionRepository = sectionRepository
    this.courseRepository = courseRepository
  }

  async execute({ sectionId, userId, userRole }) {
    const section = await this.sectionRepository.findById(sectionId)
    if (!section) throw new NotFoundError('Section')

    const course = await this.courseRepository.findById(section.course_id)
    const courseEntity = new Course({ ...course, instructorId: course.instructor_id })
    if (!courseEntity.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenError('You can only delete sections of your own courses')
    }

    await this.sectionRepository.delete(sectionId)
    return { success: true }
  }
}

module.exports=DeleteSectionUseCase