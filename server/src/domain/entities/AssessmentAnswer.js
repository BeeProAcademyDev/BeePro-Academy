class AssessmentAnswer {
  constructor({
    id,
    submissionId,
    questionId,
    selectedOptionId,
    textAnswer,
    grade,
    instructorFeedback
  }) {
    this.id = id
    this.submissionId = submissionId
    this.questionId = questionId
    this.selectedOptionId = selectedOptionId
    this.textAnswer = textAnswer
    this.grade = grade
    this.instructorFeedback = instructorFeedback
  }
}

module.exports = AssessmentAnswer
