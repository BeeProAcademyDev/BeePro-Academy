class Review {
  constructor({ id, course_id, user_id, rating, comment, created_at, updated_at, user }) {
    this.id = id
    this.courseId = course_id
    this.userId = user_id
    this.rating = typeof rating !== 'undefined' ? Number(rating) : 0
    this.comment = comment
    this.createdAt = created_at
    this.updatedAt = updated_at
    this.user = user // For populated user info
  }

  static validateRating(rating) {
    if (rating < 1 || rating > 5) {
      return { valid: false, message: 'Rating must be between 1 and 5' }
    }
    return { valid: true }
  }

  static validateComment(comment) {
    if (comment && comment.length > 1000) {
      return { valid: false, message: 'Comment must be less than 1000 characters' }
    }
    return { valid: true }
  }
}

module.exports = Review
