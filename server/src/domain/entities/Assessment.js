class Assessment {
  constructor({
    id,
    courseId,
    lessonId,
    title,
    description,
    type,
    status,
    durationMinutes,
    dueDate,
    allowLateSubmissions,
    showGrades,
    showAnswers,
    createdAt,
    updatedAt,
    questions,
    submissions
  }) {
    this.id = id
    this.courseId = courseId
    this.lessonId = lessonId
    this.title = title
    this.description = description
    this.type = type
    this.status = status
    this.durationMinutes = durationMinutes
    this.dueDate = dueDate
    this.allowLateSubmissions = allowLateSubmissions
    this.showGrades = showGrades
    this.showAnswers = showAnswers
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.questions = questions || []
    this.submissions = submissions || []
  }
}

module.exports = Assessment
