const { ValidationError, NotFoundError, ForbiddenError } = require('../../../domain/errors/AppError')
const CourseSection = require('../../../domain/entities/CourseSection')
const Course = require('../../../domain/entities/Course')

class CreateSectionUseCase {
  constructor({ sectionRepository, courseRepository }) {
    this.sectionRepository = sectionRepository
    this.courseRepository = courseRepository
  }

  async execute({ courseId, title, userId, userRole }) {
    const course = await this.courseRepository.findById(courseId)
    if (!course) throw new NotFoundError('Course')

    const courseEntity = new Course({ ...course, instructorId: course.instructor_id })
    if (!courseEntity.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenError('You can only add sections to your own courses')
    }

    const titleCheck = CourseSection.validateTitle(title)
    if (!titleCheck.valid) throw new ValidationError(titleCheck.message)

    const maxOrder = await this.sectionRepository.getMaxOrder(courseId)

    return this.sectionRepository.create({
      course_id: courseId,
      title: title.trim(),
      order: maxOrder + 1
    })
  }
}

module.exports=CreateSectionUseCase