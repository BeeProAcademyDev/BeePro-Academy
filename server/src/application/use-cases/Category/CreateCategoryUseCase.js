const { ValidationError, ConflictError, NotFoundError } = require('../../../domain/errors/AppError')
const Category = require('../../../domain/entities/Category')

class CreateCategoryUseCase {
  constructor({ categoryRepository }) {
    this.categoryRepository = categoryRepository
  }

  async execute({ name, description }) {
    const nameCheck = Category.validateName(name)
    if (!nameCheck.valid) throw new ValidationError(nameCheck.message)
    
    const cleanName = name.trim()

    const existing = await this.categoryRepository.findByName(cleanName)
    if (existing) throw new ConflictError('Category name already exists')

    return this.categoryRepository.create({ name: cleanName, description })
  }
}

module.exports=CreateCategoryUseCase