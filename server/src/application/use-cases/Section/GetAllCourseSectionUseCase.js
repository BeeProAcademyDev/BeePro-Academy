const { ValidationError, NotFoundError, ForbiddenError } = require('../../../domain/errors/AppError')
const CourseSection = require('../../../domain/entities/CourseSection')
const Course = require('../../../domain/entities/Course')

class GetAllCourseSectionUseCase {
  constructor({ sectionRepository, courseRepository }) {
    this.sectionRepository = sectionRepository
    this.courseRepository = courseRepository
  }

  async execute({ courseId }) {
    const course = await this.courseRepository.findById(courseId)
    if (!course) throw new NotFoundError('Course')

    const sections = await this.sectionRepository.findByCourseId(courseId)
    return sections
  }
}

module.exports = GetAllCourseSectionUseCase