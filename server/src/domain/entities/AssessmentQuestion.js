class AssessmentQuestion {
  constructor({
    id,
    assessmentId,
    type,
    text,
    grade,
    order,
    createdAt,
    updatedAt,
    options
  }) {
    this.id = id
    this.assessmentId = assessmentId
    this.type = type // 'mcq' or 'text'
    this.text = text
    this.grade = grade
    this.order = order
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.options = options || []
  }
}

module.exports = AssessmentQuestion
