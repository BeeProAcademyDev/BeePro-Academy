class Category {
  constructor({ id, name, description, created_at, updated_at }) {
    this.id = id
    this.name = name
    this.description = description
    this.created_at = created_at
    this.updated_at = updated_at
  }

  static validateName(name) {
    if (!name || name.trim().length < 3) {
      return { valid: false, message: 'Category name must be at least 3 characters' }
    }
    return { valid: true }
  }
}

module.exports = Category
