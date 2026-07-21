class ICourseRepository {
  async findById(id) { throw new Error('Not implemented') }
  async findAll(filters) { throw new Error('Not implemented') }
  async create(courseData) { throw new Error('Not implemented') }
  async update(id, updateData) { throw new Error('Not implemented') }
  async delete(id) { throw new Error('Not implemented') }
}

module.exports = ICourseRepository