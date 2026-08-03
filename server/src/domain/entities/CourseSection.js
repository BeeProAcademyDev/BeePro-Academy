class CourseSection {
  constructor({ id, course_id, title, order, created_at, updated_at }) {
    this.id = id
    this.course_id = course_id
    this.title = title
    this.order = order || 0
    this.created_at = created_at
    this.updated_at = updated_at
  }

  static validateTitle(title) {
    if (!title || title.trim().length < 3) {
      return { valid: false, message: 'Section title must be at least 3 characters' }
    }
    return { valid: true }
  }
}

module.exports = CourseSection
