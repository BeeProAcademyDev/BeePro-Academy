const { AppError, AuthorizationError, NotFoundError } = require('../../../../domain/errors/AppError')

class GetAssessmentSubmissionsUseCase {
  constructor({ assessmentRepository, assessmentSubmissionRepository, courseRepository }) {
    this.assessmentRepository = assessmentRepository
    this.assessmentSubmissionRepository = assessmentSubmissionRepository
    this.courseRepository = courseRepository
  }

  async execute(instructorId, assessmentId) {
    const assessment = await this.assessmentRepository.findById(assessmentId)
    if (!assessment) {
      throw new NotFoundError('Assessment')
    }

    const course = await this.courseRepository.findById(assessment.courseId)
    if (course.instructor_id !== instructorId) {
      throw new AuthorizationError('Not authorized to view submissions for this assessment', 403)
    }

    const submissions = await this.assessmentSubmissionRepository.findByAssessmentId(assessmentId)
    
    // Format the response
    return submissions.map(sub => ({
      id: sub.id,
      assessmentId: sub.assessmentId,
      userId: sub.userId,
      user: sub.user,
      status: sub.status,
      totalGrade: sub.totalGrade,
      startedAt: sub.startedAt,
      submittedAt: sub.submittedAt
    }))
  }
}

module.exports = GetAssessmentSubmissionsUseCase
