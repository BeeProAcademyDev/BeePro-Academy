class Lesson {
  constructor({ id, section_id, title, content_type, content_url, text_content, duration, is_free, order, created_at, updated_at }) {
    this.id = id
    this.section_id = section_id
    this.title = title
    this.content_type = content_type || 'video'
    this.content_url = content_url
    this.text_content = text_content
    this.duration = duration || 0
    this.is_free = !!is_free
    this.order = order || 0
    this.created_at = created_at
    this.updated_at = updated_at
  }

  static VALID_TYPES = ['video', 'article']

  static validateTitle(title) {
    if (!title || title.trim().length < 3) {
      return { valid: false, message: 'Lesson title must be at least 3 characters' }
    }
    return { valid: true }
  }

  static validateType(type) {
    if (!Lesson.VALID_TYPES.includes(type)) {
      return { valid: false, message: 'Content type must be video or article' }
    }
    return { valid: true }
  }
}

module.exports = Lesson
