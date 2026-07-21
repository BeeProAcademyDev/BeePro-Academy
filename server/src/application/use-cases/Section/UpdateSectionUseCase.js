const { ValidationError, NotFoundError, ForbiddenError } = require('../../../domain/errors/AppError')
const CourseSection = require('../../../domain/entities/CourseSection')
const Course = require('../../../domain/entities/Course')


class UpdateSectionUseCase {
  constructor({ sectionRepository, courseRepository }) {
    this.sectionRepository = sectionRepository
    this.courseRepository = courseRepository
  }

  async execute({ sectionId, title, order, userId, userRole }) {
    const section = await this.sectionRepository.findById(sectionId)
    if (!section) throw new NotFoundError('Section')

    const course = await this.courseRepository.findById(section.course_id)
    const courseEntity = new Course({ ...course, instructorId: course.instructor_id })
    if (!courseEntity.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenError('You can only edit sections of your own courses')
    }

    const updateData = {}

    if (title !== undefined) {
      const titleCheck = CourseSection.validateTitle(title)
      if (!titleCheck.valid) throw new ValidationError(titleCheck.message)
      updateData.title = title.trim()
    }

    if (order !== undefined) {
      updateData.order = parseInt(order)
    }

    if (Object.keys(updateData).length === 0) return section

    return this.sectionRepository.update(sectionId, updateData)
  }
}

module.exports=UpdateSectionUseCase