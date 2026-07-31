class AssessmentSubmission {
  constructor({
    id,
    assessmentId,
    userId,
    status,
    totalGrade,
    startedAt,
    submittedAt,
    answers
  }) {
    this.id = id
    this.assessmentId = assessmentId
    this.userId = userId
    this.status = status // 'in_progress', 'submitted', 'pending_review', 'graded'
    this.totalGrade = totalGrade
    this.startedAt = startedAt
    this.submittedAt = submittedAt
    this.answers = answers || []
  }
}

module.exports = AssessmentSubmission
