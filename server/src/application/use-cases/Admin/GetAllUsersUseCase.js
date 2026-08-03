const { toUserDTO } = require('../../dtos/authDTOs')

class GetAllUsersUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository
  }

  async execute({ page = 1, limit = 20, role, status, search }) {
    const result = await this.userRepository.findAll({ page, limit, role, status, search })

    return {
      users: result.users.map(toUserDTO),
      pagination: result.pagination,
    }
  }
}

module.exports = GetAllUsersUseCase
