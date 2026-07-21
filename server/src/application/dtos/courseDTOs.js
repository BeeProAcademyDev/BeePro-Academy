function toCourseDTO(course) {
  if (!course) return null
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    price: Number(course.price),
    status: course.status,
    instructor_id: course.instructor_id,
    category_id: course.category_id,
    created_at: course.created_at,
    updated_at: course.updated_at,
    instructor: course.instructor ? {
      id: course.instructor.id,
      full_name: course.instructor.full_name,
      avatar_url: course.instructor.avatar_url
    } : undefined
  }
}

module.exports = { toCourseDTO }
