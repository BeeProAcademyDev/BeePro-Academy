const { NotFoundError } = require('../../domain/errors/AppError')
const { toUserDTO } = require('../dtos/authDTOs')

class GetProfileUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository
  }

  async execute({ userId }) {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new NotFoundError('User')
    }

    return toUserDTO(user)
  }
}

module.exports = GetProfileUseCase
