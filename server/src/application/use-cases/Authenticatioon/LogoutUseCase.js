class LogoutUseCase {
  constructor({ tokenRepository }) {
    this.tokenRepository = tokenRepository
  }

  async execute({ refreshToken }) {
    if (refreshToken) {
      await this.tokenRepository.deleteByToken(refreshToken)
    }
    return { success: true, message: 'Logged out successfully' }
  }
}

module.exports = LogoutUseCase
