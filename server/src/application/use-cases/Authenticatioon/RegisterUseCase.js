const User = require('../../../domain/entities/User')
const { ConflictError, ValidationError } = require('../../../domain/errors/AppError')
const { toAuthResponseDTO } = require('../../dtos/authDTOs')

class RegisterUseCase {
  /**
   * @param {import('../../interfaces/IUserRepository')} userRepository
   * @param {import('../../interfaces/ITokenRepository')} tokenRepository
   * @param {import('../../interfaces/IHashService')} hashService
   * @param {import('../../interfaces/ITokenService')} tokenService
   */
  constructor({ userRepository, tokenRepository, hashService, tokenService }) {
    this.userRepository = userRepository
    this.tokenRepository = tokenRepository
    this.hashService = hashService
    this.tokenService = tokenService
  }

  async execute({ fullName, email, password, phone, role }) {
    // 1. Normalize email
    const normalizedEmail = User.normalizeEmail(email)

    // 2. Validate password strength
    const passwordCheck = User.validatePassword(password)
    if (!passwordCheck.valid) {
      throw new ValidationError(passwordCheck.message)
    }

    // 3. Check for existing user
    const existingUser = await this.userRepository.findByEmail(normalizedEmail)
    if (existingUser) {
      throw new ConflictError('An account with this email already exists')
    }

    // 4. Resolve role (instructor → pending_instructor, admin never allowed)
    const resolvedRole = User.resolveSignupRole(role)

    // 5. Hash password
    const passwordHash = await this.hashService.hash(password)

    // 6. Create user in DB
    const newUser = await this.userRepository.create({
      full_name: fullName,
      email: normalizedEmail,
      password_hash: passwordHash,
      role: resolvedRole,
      phone: phone || null,
    })

    // 7. Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    })

    const refreshTokenValue = this.tokenService.generateRefreshToken()

    // 8. Store refresh token
    const refreshExpiry = new Date()
    refreshExpiry.setDate(refreshExpiry.getDate() + 7) // 7 days

    await this.tokenRepository.create({
      token: refreshTokenValue,
      user_id: newUser.id,
      expires_at: refreshExpiry,
    })

    return {
      ...toAuthResponseDTO(newUser, accessToken, refreshTokenValue),
      pending_approval: resolvedRole === 'pending_instructor',
    }
  }
}

module.exports = RegisterUseCase
