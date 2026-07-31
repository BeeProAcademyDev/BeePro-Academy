class ILessonRepository {
  async findById(id) { throw new Error('Not implemented') }
  async findBySectionId(sectionId) { throw new Error('Not implemented') }
  async create(data) { throw new Error('Not implemented') }
  async update(id, data) { throw new Error('Not implemented') }
  async delete(id) { throw new Error('Not implemented') }
  async getMaxOrder(sectionId) { throw new Error('Not implemented') }
  async countLessonsByCourse(courseId) { throw new Error('Not implemented') }
  
  // Lesson Files
  async addFile(lessonId, data) { throw new Error('Not implemented') }
  async deleteFile(fileId) { throw new Error('Not implemented') }
  async getFileById(fileId) { throw new Error('Not implemented') }
}

module.exports = ILessonRepository