const { AppError } = require('../../../../domain/errors/AppError')

class GetSubmissionResultUseCase {
  constructor({ assessmentRepository, assessmentSubmissionRepository }) {
    this.assessmentRepository = assessmentRepository
    this.assessmentSubmissionRepository = assessmentSubmissionRepository
  }

  async execute(userId, submissionId) {
    const submission = await this.assessmentSubmissionRepository.findById(submissionId)
    if (!submission) {
      throw new AppError('Submission not found', 404)
    }

    if (submission.userId !== userId) {
      throw new AppError('Not authorized to view this submission', 403)
    }

    const assessment = await this.assessmentRepository.findById(submission.assessmentId)

    const dto = {
      id: submission.id,
      assessmentId: submission.assessmentId,
      status: submission.status,
      startedAt: submission.startedAt,
      submittedAt: submission.submittedAt
    }

    // Include grades only if the assessment is set to show grades AND the status is fully graded
    if (assessment.showGrades && submission.status === 'graded') {
      dto.totalGrade = submission.totalGrade
    }

    // Include detailed answers/feedback based on showGrades and showAnswers
    dto.answers = submission.answers.map(a => {
      const answerDto = {
        id: a.id,
        questionId: a.questionId,
        selectedOptionId: a.selectedOptionId,
        textAnswer: a.textAnswer,
      }

      if (assessment.showGrades && submission.status === 'graded') {
        answerDto.grade = a.grade
        answerDto.instructorFeedback = a.instructorFeedback
      }

      if (assessment.showAnswers) {
        // Find the question to get the correct option
        const question = assessment.questions.find(q => q.id === a.questionId)
        if (question && question.type === 'mcq') {
          const correctOption = question.options.find(o => o.isCorrect)
          if (correctOption) {
            answerDto.correctOptionId = correctOption.id
          }
        }
      }

      return answerDto
    })

    return dto
  }
}

module.exports = GetSubmissionResultUseCase
