const { AppError } = require('../../../../domain/errors/AppError')
const AssessmentSubmission = require('../../../../domain/entities/AssessmentSubmission')

class StartAssessmentUseCase {
  constructor({ assessmentRepository, assessmentSubmissionRepository, enrollmentRepository }) {
    this.assessmentRepository = assessmentRepository
    this.assessmentSubmissionRepository = assessmentSubmissionRepository
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
      throw new AppError('Must be enrolled in the course to take this assessment', 403)
    }

    // Check if there is already a submission
    const existingSubmission = await this.assessmentSubmissionRepository.findByUserAndAssessment(userId, assessmentId)
    if (existingSubmission) {
      if (existingSubmission.status !== 'in_progress') {
        throw new AppError('You have already submitted this assessment', 400)
      }
      return existingSubmission // Return the existing in-progress session
    }

    // Enforce due date before starting
    if (assessment.dueDate && !assessment.allowLateSubmissions) {
      const now = new Date()
      if (now > assessment.dueDate) {
        throw new AppError('This assessment is past its due date', 403)
      }
    }

    const submission = new AssessmentSubmission({
      assessmentId,
      userId,
      status: 'in_progress',
      totalGrade: 0,
      startedAt: new Date(),
      submittedAt: null
    })

    return await this.assessmentSubmissionRepository.create(submission)
  }
}

module.exports = StartAssessmentUseCase
