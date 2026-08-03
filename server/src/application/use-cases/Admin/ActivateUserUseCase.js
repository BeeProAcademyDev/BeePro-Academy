const { NotFoundError, ValidationError } = require('../../../domain/errors/AppError')
const { toUserDTO } = require('../../dtos/authDTOs')

class ActivateUserUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository
  }

  async execute({ userId }) {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new NotFoundError('User')
    }

    if (user.status === 'active') {
      throw new ValidationError('User is already active')
    }

    const updated = await this.userRepository.update(userId, { status: 'active' })
    return toUserDTO(updated)
  }
}

module.exports = ActivateUserUseCase
