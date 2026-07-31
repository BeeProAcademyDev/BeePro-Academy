const { AppError } = require('../../../../domain/errors/AppError')

class DeleteQuestionUseCase {
  constructor({ assessmentRepository, courseRepository }) {
    this.assessmentRepository = assessmentRepository
    this.courseRepository = courseRepository
  }

  async execute(instructorId, assessmentId) {
    const assessment = await this.assessmentRepository.findById(assessmentId)
    if (!assessment) {
      throw new AppError('Assessment not found', 404)
    }

    const course = await this.courseRepository.findById(assessment.courseId)
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized to delete questions from this assessment', 403)
    }

    await this.assessmentRepository.delete(assessmentId)
  }
}

module.exports = DeleteQuestionUseCase
