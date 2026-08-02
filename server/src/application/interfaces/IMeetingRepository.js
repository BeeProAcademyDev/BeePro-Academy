class IMeetingRepository {
  async create(data) { throw new Error('Not implemented') }
  async findById(id) { throw new Error('Not implemented') }
  async findByLessonId(lessonId) { throw new Error('Not implemented') }
  async findUpcomingByInstructorId(instructorId) { throw new Error('Not implemented') }
  async update(id, data) { throw new Error('Not implemented') }
  async delete(id) { throw new Error('Not implemented') }
}

module.exports = IMeetingRepository
