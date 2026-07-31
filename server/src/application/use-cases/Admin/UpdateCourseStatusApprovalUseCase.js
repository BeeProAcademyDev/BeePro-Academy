const {toCourseApprovalAdminDto} =require('../../dtos/CourseApprovalAdminDto')
const { NotFoundError, ForbiddenError, ValidationError } = require('../../../domain/errors/AppError')

class UpdateCourseStatusApprovalUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository
  }
  async execute({ courseId, userId, userRole, adminApprovalStatus }) {
    // Only admins can approve or reject a course
    if (userRole !== 'admin') {
      throw new ForbiddenError('Only admins can update course approval status')
    }
    const existingCourse = await this.courseRepository.findById(courseId)
    if (!existingCourse) throw new NotFoundError('Course')
    if (!['pending', 'approved', 'rejected'].includes(adminApprovalStatus)) {
      throw new ValidationError('Invalid approval status. Must be pending, approved, or rejected')
    }
    const update= this.courseRepository.update(courseId, { admin_approval_status: adminApprovalStatus })
    return toCourseApprovalAdminDto(update)
  }
}
module.exports = UpdateCourseStatusApprovalUseCase