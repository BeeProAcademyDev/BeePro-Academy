const nodemailer = require('nodemailer')
const IEmailService = require('../../application/interfaces/IEmailService')

class EmailService extends IEmailService {
  constructor({ config }) {
    super()
    this.config = config

    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: Number(config.smtpPort),
      secure: Number(config.smtpPort) === 465, // true for 465, false for 587
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      logger: true,   // logs SMTP protocol traffic to console
      debug: true,    // include SMTP traffic in the logs
    })

    // Verify connection/auth at startup, not just on send
    this.transporter.verify((err, success) => {
      if (err) {
        console.error('❌ SMTP connection/auth failed:', err)
      } else {
        console.log('✅ SMTP server is ready to send emails')
      }
    })
  }

  async sendPasswordResetOTP(to, otp) {
    const mailOptions = {
      from: this.config.emailFrom,
      to: to,
      subject: 'BeePro Academy - Your Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">Password Reset Code</h2>
          <p style="color: #555; line-height: 1.5;">You requested to reset your password for BeePro Academy.</p>
          <p style="color: #555; line-height: 1.5;">Use the following 6-digit code to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; padding: 16px 32px; background-color: #f4f4f4; border: 2px dashed #007bff; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${otp}</div>
          </div>
          <p style="color: #e74c3c; font-size: 14px; text-align: center;"><strong>This code expires in 10 minutes.</strong></p>
          <p style="color: #777; font-size: 12px; margin-top: 30px;">If you didn't request this, you can safely ignore this email. Do not share this code with anyone.</p>
          <p style="color: #555;">Best regards,<br><strong>The BeePro Academy Team</strong></p>
        </div>
      `
    }

    const info = await this.transporter.sendMail(mailOptions)

    // Don't just trust that "no exception thrown" = "email sent"
    console.log('✉️ SMTP response:', info.response)
    console.log('✉️ Accepted:', info.accepted)
    console.log('✉️ Rejected:', info.rejected)
    console.log('✉️ Pending:', info.pending)
    console.log('✉️ MessageID:', info.messageId)

    if (info.rejected && info.rejected.length > 0) {
      throw new Error(`Email rejected for recipients: ${info.rejected.join(', ')}`)
    }
    if (info.accepted && info.accepted.length === 0) {
      throw new Error('Email was not accepted by any recipient server')
    }

    return info
  }
}

module.exports = EmailService