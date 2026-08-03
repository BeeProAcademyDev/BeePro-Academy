class LogoutUseCase {
  constructor({ tokenRepository }) {
    this.tokenRepository = tokenRepository
  }

  async execute({ refreshToken, userId } = {}) {
    if (refreshToken) {
      await this.tokenRepository.deleteByToken(refreshToken)
    } else if (userId && typeof this.tokenRepository.deleteAllForUser === 'function') {
      await this.tokenRepository.deleteAllForUser(userId)
    }
    return { success: true, message: 'Logged out successfully' }
  }
}

module.exports = LogoutUseCase
