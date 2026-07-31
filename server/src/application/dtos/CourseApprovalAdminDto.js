function toCourseApprovalAdminDto(course) {
  if (!course) return null
  return {
    id: course.id,
    title: course.title,
    thumbnail_url: course.thumbnail_url,
    status: course.status,
    admin_approval_status: course.admin_approval_status,
    instructor_id: course.instructor_id,
    category_id: course.category_id,
    instructor: course.instructor ? {
      id: course.instructor.id,
      full_name: course.instructor.full_name,
    } : undefined
  }
}

module.exports = { toCourseApprovalAdminDto }