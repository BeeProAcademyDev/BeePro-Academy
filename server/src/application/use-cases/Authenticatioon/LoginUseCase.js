const User = require('../../../domain/entities/User')
const { AuthenticationError, AuthorizationError } = require('../../../domain/errors/AppError')
const { toAuthResponseDTO } = require('../../dtos/authDTOs')

class LoginUseCase {
  constructor({ userRepository, tokenRepository, hashService, tokenService }) {
    this.userRepository = userRepository
    this.tokenRepository = tokenRepository
    this.hashService = hashService
    this.tokenService = tokenService
  }

  async execute({ email, password }) {
    // 1. Find user
    const normalizedEmail = User.normalizeEmail(email)
    const user = await this.userRepository.findByEmail(normalizedEmail)

    if (!user) {
      throw new AuthenticationError('Invalid email or password')
    }

    // 2. Check if account is suspended
    if (user.status === 'suspended') {
      throw new AuthorizationError('Your account has been suspended. Please contact support.')
    }

    // 3. Verify password
    if (!user.password_hash) {
      throw new AuthenticationError(
        'This account uses social login. Please sign in with Google.'
      )
    }

    const isPasswordValid = await this.hashService.compare(password, user.password_hash)
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password')
    }

    // 4. Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    })

    const refreshTokenValue = this.tokenService.generateRefreshToken()

    // 5. Store refresh token
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

module.exports = LoginUseCase
