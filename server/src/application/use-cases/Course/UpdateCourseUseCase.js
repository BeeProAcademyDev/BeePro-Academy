const { NotFoundError, ForbiddenError, ValidationError } = require('../../../domain/errors/AppError')
const Course = require('../../../domain/entities/Course')

class UpdateCourseUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository
  }

  async execute({ courseId, userId, userRole, updateData }) {
    const existingCourse = await this.courseRepository.findById(courseId)
    if (!existingCourse) throw new NotFoundError('Course')

    const courseEntity = new Course({
      ...existingCourse,
      instructorId: existingCourse.instructor_id
    })

    if (!courseEntity.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenError('You can only edit your own courses')
    }

    if (updateData.title !== undefined) {
      const titleCheck = Course.validateTitle(updateData.title)
      if (!titleCheck.valid) throw new ValidationError(titleCheck.message)
      updateData.title = updateData.title.trim()
    }

    if (updateData.price !== undefined) {
      const priceCheck = Course.validatePrice(updateData.price)
      if (!priceCheck.valid) throw new ValidationError(priceCheck.message)
      updateData.price = Number(updateData.price)
    }

    if (updateData.status !== undefined) {
      if (!Course.VALID_STATUSES.includes(updateData.status)) {
        throw new ValidationError('Invalid status')
      }
    }

    // Rename for Prisma
    if (updateData.categoryId !== undefined) {
      updateData.category_id = updateData.categoryId
      delete updateData.categoryId
    }

    return this.courseRepository.update(courseId, updateData)
  }
}

module.exports = UpdateCourseUseCase
