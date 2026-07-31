class AssessmentOption {
  constructor({
    id,
    questionId,
    text,
    isCorrect
  }) {
    this.id = id
    this.questionId = questionId
    this.text = text
    this.isCorrect = isCorrect
  }
}

module.exports = AssessmentOption
