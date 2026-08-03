const { NotFoundError, ValidationError } = require('../../../domain/errors/AppError')
const { toUserDTO } = require('../../dtos/authDTOs')

class RejectInstructorUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository
  }

  async execute({ userId }) {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new NotFoundError('User')
    }

    if (user.role !== 'instructor') {
      throw new ValidationError('Only instructor accounts can be rejected')
    }

    if (user.status !== 'pending') {
      throw new ValidationError(`Cannot reject user with status "${user.status}". Only pending instructors can be rejected.`)
    }

    const updated = await this.userRepository.update(userId, { status: 'rejected' })
    return toUserDTO(updated)
  }
}

module.exports = RejectInstructorUseCase
