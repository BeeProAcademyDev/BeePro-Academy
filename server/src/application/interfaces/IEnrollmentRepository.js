class IEnrollmentRepository {
  async create(data) { throw new Error('Method not implemented.') }
  async findById(id) { throw new Error('Method not implemented.') }
  async findByUserAndCourse(userId, courseId) { throw new Error('Method not implemented.') }
  async findByUserId(userId) { throw new Error('Method not implemented.') }
  async findByCourseId(courseId) { throw new Error('Method not implemented.') }
  async update(id, data) { throw new Error('Method not implemented.') }
  async getStudentEnrollmentCount(userId) {throw new Error('Method Not implmeted')}
  async userCompletedCoursesCount(Id){ throw new Error('Not implemented Method') } 
  async getStudentAverageProgress(Id) {throw new Error('Not Implmented Method')}


} 

module.exports = IEnrollmentRepository;
