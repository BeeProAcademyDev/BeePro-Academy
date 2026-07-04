/**
 * IEmailService — Port for sending emails.
 */
class IEmailService {
  async sendPasswordResetOTP(to, otp) {
    throw new Error('IEmailService.sendPasswordResetOTP() not implemented')
  }
}

module.exports = IEmailService
