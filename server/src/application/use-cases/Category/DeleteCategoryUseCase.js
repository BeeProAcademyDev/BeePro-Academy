const { ValidationError, ConflictError, NotFoundError } = require('../../../domain/errors/AppError')
const Category = require('../../../domain/entities/Category')

class DeleteCategoryUseCase {
  constructor({ categoryRepository }) {
    this.categoryRepository = categoryRepository
  }

  async execute({ categoryId }) {
    const category = await this.categoryRepository.findById(categoryId)
    if (!category) throw new NotFoundError('Category')

    // Optional: Check if courses are attached and throw error if so
    await this.categoryRepository.delete(categoryId)
    return { success: true }
  }
}

module.exports=DeleteCategoryUseCase