const { AppError } = require('../../../../domain/errors/AppError')
const AssessmentQuestion = require('../../../../domain/entities/AssessmentQuestion')

class UpdateAssessmentUseCase {
  constructor({ assessmentRepository, courseRepository, assessmentSubmissionRepository, lessonRepository, notificationService }) {
    this.assessmentRepository = assessmentRepository
    this.courseRepository = courseRepository
    this.assessmentSubmissionRepository = assessmentSubmissionRepository
    this.lessonRepository = lessonRepository
    this.notificationService = notificationService
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
      updatedAssessment.questions = createdQuestions
    }

    // Trigger Notifications
    if (this.notificationService) {
      let lessonTitle = null
      const lessonId = assessment.lessonId || assessment.lesson_id
      if (lessonId && this.lessonRepository) {
        const lesson = await this.lessonRepository.findById(lessonId)
        if (lesson) lessonTitle = lesson.title
      }

      // 1. If newly published
      if (data.status === 'published' && assessment.status !== 'published') {
        await this.notificationService.notifyNewAssessment(
          course.id,
          lessonId,
          updatedAssessment.title,
          updatedAssessment.type,
          course.title,
          lessonTitle
        )
      }

      // 2. If showGrades flipped to true
      if (data.showGrades === true && assessment.showGrades !== true && this.assessmentSubmissionRepository) {
        const submissions = await this.assessmentSubmissionRepository.findByAssessmentId(assessmentId)
        const submitterUserIds = [...new Set(submissions.map(s => s.userId || s.user_id).filter(Boolean))]
        if (submitterUserIds.length > 0) {
          await this.notificationService.notifyGradesPublished(
            assessmentId,
            updatedAssessment.title,
            course.title,
            submitterUserIds,
            lessonTitle
          )
        }
      }

      // 3. If showAnswers flipped to true
      if (data.showAnswers === true && assessment.showAnswers !== true && this.assessmentSubmissionRepository) {
        const submissions = await this.assessmentSubmissionRepository.findByAssessmentId(assessmentId)
        const submitterUserIds = [...new Set(submissions.map(s => s.userId || s.user_id).filter(Boolean))]
        if (submitterUserIds.length > 0) {
          await this.notificationService.notifyReviewAllowed(
            assessmentId,
            updatedAssessment.title,
            course.title,
            submitterUserIds,
            lessonTitle
          )
        }
      }
    }

    return updatedAssessment
  }
}

module.exports = UpdateAssessmentUseCase
