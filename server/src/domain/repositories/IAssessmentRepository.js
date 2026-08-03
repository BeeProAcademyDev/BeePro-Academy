class IAssessmentRepository {
  async create(assessment) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
  async findById(id) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
  async findByCourseId(courseId) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
  async findByLessonId(lessonId) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
  async update(id, assessmentData) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
  async delete(id) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
  
  // Questions
  async addQuestion(question) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
  async updateQuestion(id, questionData) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
  async deleteQuestion(id) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
  async deleteAllQuestions(assessmentId) { throw new Error('ERR_METHOD_NOT_IMPLEMENTED') }
}

module.exports = IAssessmentRepository
