const crypto = require('crypto')
const User = require('../../../domain/entities/User')

class ForgotPasswordUseCase {
  constructor({ userRepository, hashService, emailService, config }) {
    this.userRepository = userRepository
    this.hashService = hashService
    this.emailService = emailService
    this.config = config
  }

  async execute({ email }) {
    const normalizedEmail = User.normalizeEmail(email)
    const user = await this.userRepository.findByEmail(normalizedEmail)

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return { success: true, message: 'If an account with that email exists, an OTP has been sent.' }
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString()

    // Hash the OTP before storing (so if DB is compromised, OTPs are safe)
    const hashedOtp = await this.hashService.hash(otp)

    // OTP expires in 10 minutes
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    // Store hashed OTP in user record (reusing reset_token columns)
    await this.userRepository.setResetToken(user.id, hashedOtp, expiresAt)

    // Send OTP email
    await this.emailService.sendPasswordResetOTP(normalizedEmail, otp)

    return { success: true, message: 'If an account with that email exists, an OTP has been sent.' }
  }
}

module.exports = ForgotPasswordUseCase
