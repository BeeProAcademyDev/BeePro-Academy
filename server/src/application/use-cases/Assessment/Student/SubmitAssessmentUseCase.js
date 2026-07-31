const { AppError } = require('../../../../domain/errors/AppError')
const AssessmentAnswer = require('../../../../domain/entities/AssessmentAnswer')

class SubmitAssessmentUseCase {
  constructor({ assessmentRepository, assessmentSubmissionRepository }) {
    this.assessmentRepository = assessmentRepository
    this.assessmentSubmissionRepository = assessmentSubmissionRepository
  }

  async execute(userId, assessmentId, submittedAnswers) {
    // submittedAnswers: [{ questionId, selectedOptionId, textAnswer }]
    
    const assessment = await this.assessmentRepository.findById(assessmentId)
    if (!assessment) {
      throw new AppError('Assessment not found', 404)
    }

    const submission = await this.assessmentSubmissionRepository.findByUserAndAssessment(userId, assessmentId)
    if (!submission || submission.status !== 'in_progress') {
      throw new AppError('No active in-progress assessment session found', 400)
    }

    const now = new Date()

    // 1. Enforce Due Date
    if (assessment.dueDate && !assessment.allowLateSubmissions) {
      if (now > assessment.dueDate) {
        throw new AppError('Assessment is past its due date and does not allow late submissions', 403)
      }
    }

    // 2. Enforce Timer
    if (assessment.durationMinutes > 0) {
      const durationMs = assessment.durationMinutes * 60 * 1000
      const elapsedMs = now - submission.startedAt
      // Allow a 1-minute grace period for network latency
      if (elapsedMs > (durationMs + 60000)) {
        throw new AppError('Time limit exceeded', 403)
      }
    }

    let totalGrade = 0
    let hasTextQuestions = false

    // 3. Process Answers
    for (const submitted of submittedAnswers) {
      const question = assessment.questions.find(q => q.id === submitted.questionId)
      if (!question) continue

      let grade = 0
      if (question.type === 'mcq') {
        const selectedOption = question.options.find(o => o.id === submitted.selectedOptionId)
        if (selectedOption && selectedOption.isCorrect) {
          grade = question.grade
        }
      } else if (question.type === 'text') {
        hasTextQuestions = true
        // Text questions are graded manually later
      }

      totalGrade += grade

      const answer = new AssessmentAnswer({
        submissionId: submission.id,
        questionId: question.id,
        selectedOptionId: question.type === 'mcq' ? submitted.selectedOptionId : null,
        textAnswer: question.type === 'text' ? submitted.textAnswer : null,
        grade: grade,
        instructorFeedback: null
      })

      await this.assessmentSubmissionRepository.addAnswer(answer)
    }

    // 4. Update Submission Status
    const nextStatus = hasTextQuestions ? 'pending_review' : 'graded'

    return await this.assessmentSubmissionRepository.update(submission.id, {
      status: nextStatus,
      totalGrade: totalGrade,
      submittedAt: now
    })
  }
}

module.exports = SubmitAssessmentUseCase
