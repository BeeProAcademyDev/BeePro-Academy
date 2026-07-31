class ILessonProgressRepository {
  async create(data) { throw new Error('Method not implemented.') }
  async findById(id) { throw new Error('Method not implemented.') }
  async findByUserAndLesson(userId, lessonId) { throw new Error('Method not implemented.') }
  async findByUserAndCourse(userId, courseId) { throw new Error('Method not implemented.') }
  async update(id, data) { throw new Error('Method not implemented.') }
}

module.exports = ILessonProgressRepository;
