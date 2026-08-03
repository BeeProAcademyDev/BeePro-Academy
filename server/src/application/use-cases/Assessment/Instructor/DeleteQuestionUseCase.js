const { AppError } = require('../../../../domain/errors/AppError')

class DeleteQuestionUseCase {
  constructor({ assessmentRepository, courseRepository }) {
    this.assessmentRepository = assessmentRepository
    this.courseRepository = courseRepository
  }

  async execute(instructorId, assessmentId, questionId) {
    const assessment = await this.assessmentRepository.findById(assessmentId)
    if (!assessment) {
      throw new AppError('Assessment not found', 404)
    }

    const course = await this.courseRepository.findById(assessment.courseId)
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized to delete questions from this assessment', 403)
    }

    const question = assessment.questions.find(q => q.id === questionId)
    if (!question) {
      throw new AppError('Question not found', 404)
    }

    await this.assessmentRepository.deleteQuestion(questionId)
  }
}

module.exports = DeleteQuestionUseCase
