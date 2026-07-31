class IAssessmentSubmissionRepository {
  async create(submission) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
  async findById(id) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
  async findByUserAndAssessment(userId, assessmentId) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
  async update(id, submissionData) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
  
  // Answers
  async addAnswer(answer) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
  async updateAnswer(id, answerData) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
}

module.exports = IAssessmentSubmissionRepository
