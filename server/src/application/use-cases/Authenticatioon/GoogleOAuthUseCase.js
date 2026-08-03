const User = require('../../../domain/entities/User')
const { AuthenticationError } = require('../../../domain/errors/AppError')
const { toAuthResponseDTO } = require('../../dtos/authDTOs')

class GoogleOAuthUseCase {
  constructor({ userRepository, tokenRepository, tokenService, googleOAuthService }) {
    this.userRepository = userRepository
    this.tokenRepository = tokenRepository
    this.tokenService = tokenService
    this.googleOAuthService = googleOAuthService
  }

  /**
   * Get the Google OAuth consent screen URL.
   */
  getAuthUrl() {
    return this.googleOAuthService.getAuthUrl()
  }

  /**
   * Handle the callback from Google after user consent.
   */
  async execute({ code }) {
    // 1. Exchange code for Google profile
    const googleProfile = await this.googleOAuthService.getProfile(code)

    if (!googleProfile || !googleProfile.email) {
      throw new AuthenticationError('Failed to retrieve profile from Google')
    }

    const normalizedEmail = User.normalizeEmail(googleProfile.email)

    // 2. Find or create user
    let user = await this.userRepository.findByEmail(normalizedEmail)

    if (user) {
      // Existing user — check suspension
      if (user.is_suspended) {
        throw new AuthenticationError('Your account has been suspended.')
      }

      // Update avatar if not set
      if (!user.avatar_url && googleProfile.picture) {
        await this.userRepository.update(user.id, { avatar_url: googleProfile.picture })
        user.avatar_url = googleProfile.picture
      }
    } else {
      // Create new user (no password — OAuth only)
      user = await this.userRepository.create({
        full_name: googleProfile.name || googleProfile.email.split('@')[0],
        email: normalizedEmail,
        password_hash: null,
        role: 'student',
        avatar_url: googleProfile.picture || null,
      })
    }

    // 3. Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    })

    const refreshTokenValue = this.tokenService.generateRefreshToken()

    const refreshExpiry = new Date()
    refreshExpiry.setDate(refreshExpiry.getDate() + 7)

    await this.tokenRepository.create({
      token: refreshTokenValue,
      user_id: user.id,
      expires_at: refreshExpiry,
    })

    return toAuthResponseDTO(user, accessToken, refreshTokenValue)
  }
}

module.exports = GoogleOAuthUseCase
