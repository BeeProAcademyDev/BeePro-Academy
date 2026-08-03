class AdminDashboardStats {
  constructor({ userRepository, courseRepository, blogPostRepository }) {
    this.userRepository = userRepository
    this.courseRepository = courseRepository
    this.blogPostRepository = blogPostRepository
  }

  async execute() {
    const [
      totalUsers,
      pendingInstructorAccounts,
      pendingCourses,
      pendingPosts,
      totalCourses
    ] = await Promise.all([
      this.userRepository.countAll(),
      this.userRepository.countPendingInstructors(),
      this.courseRepository.countPendingApproval(),
      this.blogPostRepository.countPending(),
      this.courseRepository.countAll()
    ])

    return {
      totalUsers,
      pendingInstructorAccounts,
      pendingCourses,
      pendingPosts,
      totalCourses
    }
  }
}

module.exports = AdminDashboardStats