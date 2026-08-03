const { AppError } = require('../../../../domain/errors/AppError')

class ReviewSubmissionUseCase {
  constructor({ assessmentRepository, assessmentSubmissionRepository, courseRepository }) {
    this.assessmentRepository = assessmentRepository
    this.assessmentSubmissionRepository = assessmentSubmissionRepository
    this.courseRepository = courseRepository
  }

  async execute(instructorId, submissionId, updates) {
    // updates: { answers: [{ answerId, grade, instructorFeedback }] }
    
    const submission = await this.assessmentSubmissionRepository.findById(submissionId)
    if (!submission) {
      throw new AppError('Submission not found', 404)
    }

    const assessment = await this.assessmentRepository.findById(submission.assessmentId)
    const course = await this.courseRepository.findById(assessment.courseId)
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized to review this submission', 403)
    }

    if (submission.status === 'in_progress') {
      throw new AppError('Cannot review a submission that is still in progress', 400)
    }

    // Process answer updates
    let updatedTotalGrade = submission.totalGrade

    for (const update of updates.answers) {
      const existingAnswer = submission.answers.find(a => a.id === update.answerId)
      if (!existingAnswer) continue

      const question = assessment.questions.find(q => q.id === existingAnswer.questionId)
      if (!question) continue

      if (question.type !== 'text') {
        continue // Gracefully skip auto-graded (MCQ) questions instead of throwing an error
      }

      if (update.grade > question.grade) {
        throw new AppError(`Grade cannot exceed max points (${question.grade}) for question ${question.id}`, 400)
      }

      const diff = update.grade - existingAnswer.grade
      updatedTotalGrade += diff

      await this.assessmentSubmissionRepository.updateAnswer(update.answerId, {
        grade: update.grade,
        instructorFeedback: update.instructorFeedback || existingAnswer.instructorFeedback
      })
    }

    // Mark as graded
    return await this.assessmentSubmissionRepository.update(submissionId, {
      status: 'graded',
      totalGrade: updatedTotalGrade,
      submittedAt: submission.submittedAt
    })
  }
}

module.exports = ReviewSubmissionUseCase
