const { ValidationError, ForbiddenError } = require('../../../domain/errors/AppError')
const Course = require('../../../domain/entities/Course')

class CreateCourseUseCase {
  constructor({ courseRepository, userRepository }) {
    this.courseRepository = courseRepository
    this.userRepository = userRepository
  }

  async execute({ title, description, price, categoryId, instructorId, userRole }) {
    const titleCheck = Course.validateTitle(title)
    if (!titleCheck.valid) throw new ValidationError(titleCheck.message)
    
    const priceCheck = Course.validatePrice(price)
    if (!priceCheck.valid) throw new ValidationError(priceCheck.message)

    // Admins can create courses on behalf of instructors, instructors create for themselves
    if (userRole !== 'admin') {
      const instructor = await this.userRepository.findById(instructorId)
      if (!instructor || instructor.role !== 'instructor') {
        throw new ForbiddenError('Only instructors can create courses')
      }
    }

    const courseData = {
      title: title.trim(),
      description,
      price: price ? Number(price) : 0,
      category_id: categoryId || null,
      instructor_id: instructorId,
      status: 'draft', // New courses are always draft
    }

    return this.courseRepository.create(courseData)
  }
}

module.exports = CreateCourseUseCase
