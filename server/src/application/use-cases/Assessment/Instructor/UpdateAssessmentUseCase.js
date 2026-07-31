const { AppError } = require('../../../../domain/errors/AppError')
const AssessmentQuestion = require('../../../../domain/entities/AssessmentQuestion')

class UpdateAssessmentUseCase {
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
      throw new AppError('Not authorized to update this assessment', 403)
    }

    const updatedAssessment = await this.assessmentRepository.update(assessmentId, {
      title: data.title ?? assessment.title,
      description: data.description ?? assessment.description,
      status: data.status ?? assessment.status,
      durationMinutes: data.durationMinutes ?? assessment.durationMinutes,
      dueDate: data.dueDate !== undefined ? data.dueDate : assessment.dueDate,
      allowLateSubmissions: data.allowLateSubmissions ?? assessment.allowLateSubmissions,
      showGrades: data.showGrades ?? assessment.showGrades,
      showAnswers: data.showAnswers ?? assessment.showAnswers
    })

    if (data.questions && Array.isArray(data.questions)) {
      await this.assessmentRepository.deleteAllQuestions(assessmentId)
      const createdQuestions = await Promise.all(
        data.questions.map((q, index) => {
          const question = new AssessmentQuestion({
            assessmentId,
            type: q.type,
            text: q.text,
            grade: q.grade || 1,
            order: q.order ?? index,
            options: q.type === 'mcq' ? q.options : []
          })
          return this.assessmentRepository.addQuestion(question)
        })
      )
      return { ...updatedAssessment, questions: createdQuestions }
    }

    return updatedAssessment
  }
}

module.exports = UpdateAssessmentUseCase
