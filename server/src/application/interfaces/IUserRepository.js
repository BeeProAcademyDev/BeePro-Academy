/**
 * IUserRepository — Port for user persistence.
 * Infrastructure layer must provide a concrete implementation.
 */
class IUserRepository {
  async findById(id) {
    throw new Error('IUserRepository.findById() not implemented')
  }

  async findByEmail(email) {
    throw new Error('IUserRepository.findByEmail() not implemented')
  }

  async create(userData) {
    throw new Error('IUserRepository.create() not implemented')
  }

  async update(id, data) {
    throw new Error('IUserRepository.update() not implemented')
  }

  async updatePassword(id, passwordHash) {
    throw new Error('IUserRepository.updatePassword() not implemented')
  }

  async setResetToken(id, hashedToken, expiresAt) {
    throw new Error('IUserRepository.setResetToken() not implemented')
  }

  async clearResetToken(id) {
    throw new Error('IUserRepository.clearResetToken() not implemented')
  }
}

module.exports = IUserRepository
