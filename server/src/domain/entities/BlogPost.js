class BlogPost {
  constructor({
    id,
    title,
    content,
    image_url,
    author_id,
    category,
    level,
    is_published,
    is_updated,
    created_at,
    updated_at,
    author
  }) {
    this.id = id
    this.title = title
    this.content = content
    this.imageUrl = image_url
    this.authorId = author_id
    this.category = category
    this.level = level
    this.isPublished = typeof is_published !== 'undefined' ? Boolean(is_published) : false
    this.isUpdated = typeof is_updated !== 'undefined' ? Boolean(is_updated) : false
    this.createdAt = created_at
    this.updatedAt = updated_at
    
    // Populated relations
    if (author) {
      this.author = {
        id: author.id,
        fullName: author.fullName || author.full_name,
        avatarUrl: author.avatarUrl || author.avatar_url,
        bio: author.bio
      }
    }
  }

  static validateTitle(title) {
    if (!title || title.length < 3) {
      return { valid: false, message: 'Title must be at least 3 characters long' }
    }
    if (title.length > 255) {
      return { valid: false, message: 'Title must be less than 255 characters' }
    }
    return { valid: true }
  }

  static validateContent(content) {
    if (!content || content.length < 10) {
      return { valid: false, message: 'Content must be at least 10 characters long' }
    }
    return { valid: true }
  }
}

module.exports = BlogPost
