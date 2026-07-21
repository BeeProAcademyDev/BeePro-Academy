const { NotFoundError, ValidationError } = require('../../../domain/errors/AppError')
const { toUserDTO } = require('../../dtos/authDTOs')

class SuspendUserUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository
  }

  async execute({ userId, adminId }) {
    if (userId === adminId) {
      throw new ValidationError('You cannot suspend yourself')
    }

    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new NotFoundError('User')
    }

    if (user.role === 'admin') {
      throw new ValidationError('Cannot suspend another admin')
    }

    if (user.status === 'suspended') {
      throw new ValidationError('User is already suspended')
    }

    const updated = await this.userRepository.update(userId, { status: 'suspended' })
    return toUserDTO(updated)
  }
}

module.exports = SuspendUserUseCase
