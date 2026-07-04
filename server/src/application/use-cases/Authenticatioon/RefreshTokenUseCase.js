const { AuthenticationError } = require('../../../domain/errors/AppError')

class RefreshTokenUseCase {
  constructor({ userRepository, tokenRepository, tokenService }) {
    this.userRepository = userRepository
    this.tokenRepository = tokenRepository
    this.tokenService = tokenService
  }

  async execute({ refreshToken }) {
    // 1. Find the refresh token in DB
    const storedToken = await this.tokenRepository.findByToken(refreshToken)

    if (!storedToken) {
      throw new AuthenticationError('Invalid refresh token')
    }

    // 2. Check expiration
    if (new Date() > new Date(storedToken.expires_at)) {
      await this.tokenRepository.deleteByToken(refreshToken)
      throw new AuthenticationError('Refresh token has expired. Please log in again.')
    }

    // 3. Find the user
    const user = await this.userRepository.findById(storedToken.user_id)
    if (!user) {
      await this.tokenRepository.deleteByToken(refreshToken)
      throw new AuthenticationError('User not found')
    }

    if (user.is_suspended) {
      await this.tokenRepository.deleteAllForUser(user.id)
      throw new AuthenticationError('Your account has been suspended.')
    }

    // 4. Rotate: delete old refresh token, issue new pair
    await this.tokenRepository.deleteByToken(refreshToken)

    const newAccessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    })

    const newRefreshTokenValue = this.tokenService.generateRefreshToken()

    const refreshExpiry = new Date()
    refreshExpiry.setDate(refreshExpiry.getDate() + 7)

    await this.tokenRepository.create({
      token: newRefreshTokenValue,
      user_id: user.id,
      expires_at: refreshExpiry,
    })

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshTokenValue,
    }
  }
}

module.exports = RefreshTokenUseCase
