/**
 * ITokenRepository — Port for refresh token persistence.
 */
class ITokenRepository {
  async create(tokenData) {
    throw new Error('ITokenRepository.create() not implemented')
  }

  async findByToken(token) {
    throw new Error('ITokenRepository.findByToken() not implemented')
  }

  async deleteByToken(token) {
    throw new Error('ITokenRepository.deleteByToken() not implemented')
  }

  async deleteAllForUser(userId) {
    throw new Error('ITokenRepository.deleteAllForUser() not implemented')
  }

  async deleteExpired() {
    throw new Error('ITokenRepository.deleteExpired() not implemented')
  }
}

module.exports = ITokenRepository
