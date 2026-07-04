const User = require('../../domain/entities/User')
const { AuthenticationError, ValidationError } = require('../../domain/errors/AppError')

class ResetPasswordUseCase {
  constructor({ userRepository, tokenRepository, hashService }) {
    this.userRepository = userRepository
    this.tokenRepository = tokenRepository
    this.hashService = hashService
  }

  async execute({ email, otp, newPassword }) {
    // 1. Validate new password
    const passwordCheck = User.validatePassword(newPassword)
    if (!passwordCheck.valid) {
      throw new ValidationError(passwordCheck.message)
    }

    // 2. Find user
    const normalizedEmail = User.normalizeEmail(email)
    const user = await this.userRepository.findByEmail(normalizedEmail)

    if (!user || !user.reset_token) {
      throw new AuthenticationError('Invalid or expired OTP')
    }

    // 3. Check OTP expiry
    if (new Date() > new Date(user.reset_token_exp)) {
      await this.userRepository.clearResetToken(user.id)
      throw new AuthenticationError('OTP has expired. Please request a new one.')
    }

    // 4. Verify the OTP matches (compare raw OTP to stored hash)
    const isOtpValid = await this.hashService.compare(otp, user.reset_token)
    if (!isOtpValid) {
      throw new AuthenticationError('Invalid OTP. Please check and try again.')
    }

    // 5. Hash new password and update
    const newPasswordHash = await this.hashService.hash(newPassword)
    await this.userRepository.updatePassword(user.id, newPasswordHash)

    // 6. Clear OTP
    await this.userRepository.clearResetToken(user.id)

    // 7. Invalidate all refresh tokens (force re-login everywhere)
    await this.tokenRepository.deleteAllForUser(user.id)

    return { success: true, message: 'Password has been reset successfully. Please log in.' }
  }
}

module.exports = ResetPasswordUseCase
