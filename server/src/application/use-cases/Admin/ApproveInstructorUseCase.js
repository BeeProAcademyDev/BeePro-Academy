const { NotFoundError, ValidationError } = require('../../../domain/errors/AppError')
const { toUserDTO } = require('../../dtos/authDTOs')

class ApproveInstructorUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository
  }

  async execute({ userId }) {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new NotFoundError('User')
    }

    if (user.role !== 'instructor') {
      throw new ValidationError('Only instructor accounts can be approved')
    }

    if (user.status !== 'pending') {
      throw new ValidationError(`Cannot approve user with status "${user.status}". Only pending instructors can be approved.`)
    }

    const updated = await this.userRepository.update(userId, { status: 'active' })
    return toUserDTO(updated)
  }
}

module.exports = ApproveInstructorUseCase
