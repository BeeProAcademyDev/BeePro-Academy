// domain/entities/Course.js
class Course {
  constructor({ id, title, description, price, status, instructorId, categoryId, createdAt, updatedAt }) {
    this.id = id
    this.title = title
    this.description = description
    this.price = typeof price === 'string' || typeof price === 'number' ? Number(price) : 0
    this.status = status              // 'draft' | 'published' | 'archived'
    this.instructorId = instructorId
    this.categoryId = categoryId
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  // ── Business Rules ──

  static VALID_STATUSES = ['draft', 'published', 'archived']

  static validateTitle(title) {
    if (!title || title.trim().length < 5) {
      return { valid: false, message: 'Title must be at least 5 characters' }
    }
    return { valid: true }
  }

  static validatePrice(price) {
    if (price !== undefined && price !== null && Number(price) < 0) {
      return { valid: false, message: 'Price cannot be negative' }
    }
    return { valid: true }
  }

  isPublished() {
    return this.status === 'published'
  }

  canBeEditedBy(userId, userRole) {
    if (userRole === 'admin') return true
    return this.instructorId === userId
  }

  canBeDeletedBy(userId, userRole) {
    if (userRole === 'admin') return true
    return this.instructorId === userId
  }
}

module.exports = Course
