const { ValidationError, ConflictError, NotFoundError } = require('../../../domain/errors/AppError')
const Category = require('../../../domain/entities/Category')

class UpdateCategoryUseCase {
  constructor({ categoryRepository }) {
    this.categoryRepository = categoryRepository
  }

  async execute({ categoryId, name, description }) {
    const category = await this.categoryRepository.findById(categoryId)
    if (!category) throw new NotFoundError('Category')

    const updateData = {}

    if (name !== undefined) {
      const nameCheck = Category.validateName(name)
      if (!nameCheck.valid) throw new ValidationError(nameCheck.message)
      
      const cleanName = name.trim()
      if (cleanName !== category.name) {
        const existing = await this.categoryRepository.findByName(cleanName)
        if (existing) throw new ConflictError('Category name already exists')
        updateData.name = cleanName
      }
    }

    if (description !== undefined) {
      updateData.description = description
    }

    if (Object.keys(updateData).length === 0) return category

    return this.categoryRepository.update(categoryId, updateData)
  }
}

module.exports = UpdateCategoryUseCase