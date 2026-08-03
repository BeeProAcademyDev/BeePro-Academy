const { toUserDTO } = require('../../dtos/authDTOs')

class GetPendingInstructorsUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository
  }

  async execute() {
    const users = await this.userRepository.findByRoleAndStatus('instructor', 'pending')
    return users.map(toUserDTO)
  }
}

module.exports = GetPendingInstructorsUseCase
