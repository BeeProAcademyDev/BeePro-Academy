const { NotFoundError } = require('../../../domain/errors/AppError')
const { toUserDTO } = require('../../dtos/authDTOs')

class UpdateProfileUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository
  }

  async execute({ userId, data }) {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new NotFoundError('User')
    }

    // Only allow updating safe fields
    const allowedUpdates = {}
    if (data.full_name !== undefined) allowedUpdates.full_name = data.full_name
    if (data.phone !== undefined) allowedUpdates.phone = data.phone
    if (data.avatar_url !== undefined) allowedUpdates.avatar_url = data.avatar_url

    const updatedUser = await this.userRepository.update(userId, allowedUpdates)

    return toUserDTO(updatedUser)
  }
}

module.exports = UpdateProfileUseCase
