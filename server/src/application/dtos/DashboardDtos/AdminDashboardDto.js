function toAdminDashboardDto(data) {
  if (!data) return null
  return {
    totalUsers: data.totalUsers ?? 0,
    pendingInstructorAccounts: data.pendingInstructorAccounts ?? 0,
    pendingCourses: data.pendingCourses ?? 0,
    pendingPosts: data.pendingPosts ?? 0,
    totalCourses: data.totalCourses ?? 0
  }
}

module.exports = { toAdminDashboardDto }
