function toTeacherDashboardDto(data) {
  if (!data) return null
  return {
    myCourses: data.myCourses ?? 0,
    publishedCourses: data.publishedCourses ?? 0,
    draftCourses: data.draftCourses ?? 0,
    pendingApproval: data.pendingApproval ?? 0,
    totalStudents: data.totalStudents ?? 0,
    totalLessons: data.totalLessons ?? 0,
    totalSections: data.totalSections ?? 0,
    averageRating: Number(data.averageRating ?? 0)
  }
}

module.exports = { toTeacherDashboardDto }