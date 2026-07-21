class GetInstructorCoursesUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository
  }

  async execute({ instructorId, userRole, page = 1, limit = 20, status, search }) {
    return this.courseRepository.findAll({
      page,
      limit,
      // Admins see all courses; instructors only see their own
      instructorId: userRole === 'admin' ? undefined : instructorId,
      status,
      search
    })
  }
}

module.exports = GetInstructorCoursesUseCase
