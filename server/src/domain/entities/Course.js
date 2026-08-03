// domain/entities/Course.js
class Course {
  constructor({ 
    id, title, description, thumbnailUrl, price, status, adminApprovalStatus, 
    rank, averageRating, totalReviews, views, totalDuration, 
    instructorId, categoryId, createdAt, updatedAt 
  }) {
    this.id = id
    this.title = title
    this.description = description
    this.thumbnailUrl = thumbnailUrl
    this.price = typeof price === 'string' || typeof price === 'number' ? Number(price) : 0
    this.status = status              // 'draft' | 'published' | 'archived'
    this.adminApprovalStatus = adminApprovalStatus || 'pending' // 'pending' | 'approved' | 'rejected'
    this.rank = rank
    this.averageRating = typeof averageRating !== 'undefined' ? Number(averageRating) : 0
    this.totalReviews = typeof totalReviews !== 'undefined' ? Number(totalReviews) : 0
    this.views = typeof views !== 'undefined' ? Number(views) : 0
    this.totalDuration = typeof totalDuration !== 'undefined' ? Number(totalDuration) : 0
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
