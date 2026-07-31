const { AppError } = require('../../../../domain/errors/AppError')

class GetAssessmentDetailsUseCase {
  constructor({ assessmentRepository, enrollmentRepository }) {
    this.assessmentRepository = assessmentRepository
    this.enrollmentRepository = enrollmentRepository
  }

  async execute(userId, assessmentId) {
    const assessment = await this.assessmentRepository.findById(assessmentId)
    if (!assessment) {
      throw new AppError('Assessment not found', 404)
    }

    if (assessment.status !== 'published') {
      throw new AppError('Assessment is not published yet', 403)
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, assessment.courseId)
    if (!enrollment) {
      throw new AppError('Must be enrolled in the course to view this assessment', 403)
    }

    // Prepare a DTO that hides sensitive info like `isCorrect`
    const dto = {
      id: assessment.id,
      courseId: assessment.courseId,
      lessonId: assessment.lessonId,
      title: assessment.title,
      description: assessment.description,
      type: assessment.type,
      durationMinutes: assessment.durationMinutes,
      dueDate: assessment.dueDate,
      questions: assessment.questions.map(q => ({
        id: q.id,
        type: q.type,
        text: q.text,
        grade: q.grade,
        order: q.order,
        options: q.options.map(o => ({
          id: o.id,
          text: o.text
          // We EXPLICITLY omit `isCorrect` here to prevent cheating
        }))
      }))
    }

    return dto
  }
}

module.exports = GetAssessmentDetailsUseCase
