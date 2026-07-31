class LessonFile {
  constructor({ id, lesson_id, file_name, file_url, file_type, size_bytes, created_at, updated_at }) {
    this.id = id
    this.lesson_id = lesson_id
    this.file_name = file_name
    this.file_url = file_url
    this.file_type = file_type || 'other'
    this.size_bytes = size_bytes || 0
    this.created_at = created_at
    this.updated_at = updated_at
  }

  static VALID_TYPES = ['pdf', 'document', 'source_code', 'image', 'other']

  static validateType(type) {
    if (!LessonFile.VALID_TYPES.includes(type)) {
      return { valid: false, message: 'Invalid file type' }
    }
    return { valid: true }
  }
}

module.exports = LessonFile
