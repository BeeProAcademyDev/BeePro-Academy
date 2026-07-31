const { AppError, AuthorizationError, NotFoundError } = require('../../../../domain/errors/AppError')

class GetSubmissionForReviewUseCase {
  constructor({ assessmentRepository, assessmentSubmissionRepository, courseRepository }) {
    this.assessmentRepository = assessmentRepository
    this.assessmentSubmissionRepository = assessmentSubmissionRepository
    this.courseRepository = courseRepository
  }

  async execute(instructorId, submissionId) {
    const submission = await this.assessmentSubmissionRepository.findById(submissionId)
    if (!submission) {
      throw new NotFoundError('Submission')
    }

    const assessment = await this.assessmentRepository.findById(submission.assessmentId)
    if (!assessment) {
      throw new NotFoundError('Assessment')
    }

    const course = await this.courseRepository.findById(assessment.courseId)
    if (course.instructor_id !== instructorId) {
      throw new AuthorizationError('Not authorized to view this submission', 403)
    }

    const dto = {
      id: submission.id,
      assessmentId: submission.assessmentId,
      userId: submission.userId,
      status: submission.status,
      totalGrade: submission.totalGrade,
      startedAt: submission.startedAt,
      submittedAt: submission.submittedAt,
      answers: submission.answers.map(a => {
        const question = assessment.questions.find(q => q.id === a.questionId)
        return {
          id: a.id,
          questionId: a.questionId,
          questionText: question ? question.text : null,
          questionType: question ? question.type : null,
          maxGrade: question ? question.grade : 0,
          selectedOptionId: a.selectedOptionId,
          textAnswer: a.textAnswer,
          grade: a.grade,
          instructorFeedback: a.instructorFeedback
        }
      })
    }

    return dto
  }
}

module.exports = GetSubmissionForReviewUseCase
