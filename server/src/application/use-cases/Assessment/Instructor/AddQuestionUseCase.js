const AssessmentQuestion = require('../../../../domain/entities/AssessmentQuestion')
const { AppError } = require('../../../../domain/errors/AppError')

class AddQuestionUseCase {
  constructor({ assessmentRepository, courseRepository }) {
    this.assessmentRepository = assessmentRepository
    this.courseRepository = courseRepository
  }

  async execute(instructorId, assessmentId, data) {
    const assessment = await this.assessmentRepository.findById(assessmentId)
    if (!assessment) {
      throw new AppError('Assessment not found', 404)
    }

    const course = await this.courseRepository.findById(assessment.courseId)
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized to add questions to this assessment', 403)
    }

    // Validation for MCQ options
    if (data.type === 'mcq') {
      if (!data.options || data.options.length < 2) {
        throw new AppError('MCQ questions must have at least 2 options', 400)
      }
      const hasCorrect = data.options.some(opt => opt.isCorrect)
      if (!hasCorrect) {
        throw new AppError('MCQ questions must have at least 1 correct option', 400)
      }
    }

    const question = new AssessmentQuestion({
      assessmentId,
      type: data.type,
      text: data.text,
      grade: data.grade || 1,
      order: data.order || 0,
      options: data.options || [] // options is array of { text, isCorrect }
    })

    return await this.assessmentRepository.addQuestion(question)
  }
}

module.exports = AddQuestionUseCase
