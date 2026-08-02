function toStudentDashboardDto(studentDashboard) {
  if (!studentDashboard) return null
  return {
    EnrolledCourses: studentDashboard.StudentEnrolledCoursesCount ?? 0,
    CompletedLessons: studentDashboard.CompletedLessons ?? 0,
    CompletedCourses: studentDashboard.CompletedCourses ?? 0,
    AvgLearningProgress: studentDashboard.LearningProgress ?? 0
  }
}

module.exports = { toStudentDashboardDto }