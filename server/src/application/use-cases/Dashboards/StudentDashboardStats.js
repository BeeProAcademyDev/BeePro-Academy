class StudentDashboardStats {
  constructor({ enrollmentRepository, lessonProgressRepository }) {
    this.enrollmentRepository = enrollmentRepository
    this.lessonProgressRepository = lessonProgressRepository
  }

  async execute({ userId }) {
    const StudentEnrolledCoursesCount = await this.enrollmentRepository.getStudentEnrollmentCount(userId)
    const CompletedLessons = await this.lessonProgressRepository.CompletedLessonsCount(userId)
    const CompletedCourses = await this.enrollmentRepository.userCompletedCoursesCount(userId)
    const LearningProgress = await this.enrollmentRepository.getStudentAverageProgress(userId)

    return {
      StudentEnrolledCoursesCount,
      CompletedLessons,
      CompletedCourses,
      LearningProgress
    }
  }
}

module.exports = StudentDashboardStats