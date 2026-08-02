class ICourseRepository {
  async findById(id) { throw new Error('Not implemented') }
  async findAll(filters) { throw new Error('Not implemented') }
  async create(courseData) { throw new Error('Not implemented') }
  async update(id, updateData) { throw new Error('Not implemented') }
  async delete(id) { throw new Error('Not implemented') }
  async recalculateTotalDuration(courseId) { throw new Error('Not implemented') }
  async getMyTotalCourses(instructor_id){throw new Error('Method Not implmented')}
  async getMyPublishedCourses(instructorId){throw new Error('Method Not implmented')}
  async GetMyTotalDraftCourses(instructorId){throw new Error('Method not implmented')}
  async GetMyTotalAdminPendingCourses(instructorId){throw new Error('Method not implmented')}
}

module.exports = ICourseRepository