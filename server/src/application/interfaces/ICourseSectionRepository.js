class ICourseSectionRepository {
  async findById(id) { throw new Error('Not implemented') }
  async findByCourseId(courseId) { throw new Error('Not implemented') }
  async create(data) { throw new Error('Not implemented') }
  async update(id, data) { throw new Error('Not implemented') }
  async delete(id) { throw new Error('Not implemented') }
  async getMaxOrder(courseId) { throw new Error('Not implemented') }
}

module.exports = ICourseSectionRepository
