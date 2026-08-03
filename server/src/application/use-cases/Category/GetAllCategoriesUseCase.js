const { ValidationError, ConflictError, NotFoundError } = require('../../../domain/errors/AppError')
const Category = require('../../../domain/entities/Category')

class GetAllCategoriesUseCase {
  constructor({ categoryRepository }) {
    this.categoryRepository = categoryRepository
  }
  
  async execute() {
    return this.categoryRepository.findAll()
  }
}

module.exports = GetAllCategoriesUseCase