const { NotFoundError, ValidationError } = require('../../../domain/errors/AppError')

class DeleteUserUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository
  }

  async execute({ userId, adminId }) {
    if (userId === adminId) {
      throw new ValidationError('You cannot delete yourself')
    }

    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new NotFoundError('User')
    }

    if (user.role === 'admin') {
      throw new ValidationError('Cannot delete another admin')
    }

    await this.userRepository.delete(userId)
    return { message: 'User deleted successfully' }
  }
}

module.exports = DeleteUserUseCase
