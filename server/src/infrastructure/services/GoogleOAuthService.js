const { OAuth2Client } = require('google-auth-library')

class GoogleOAuthService {
  constructor({ config }) {
    this.config = config
    this.client = new OAuth2Client(
      config.googleClientId,
      config.googleClientSecret,
      config.googleCallbackUrl
    )
  }

  getAuthUrl() {
    if (!this.config.googleClientId) {
      throw new Error('Google OAuth is not configured.')
    }

    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
      prompt: 'consent',
    })
  }

  async getProfile(code) {
    if (!this.config.googleClientId) {
      throw new Error('Google OAuth is not configured.')
    }

    try {
      const { tokens } = await this.client.getToken(code)
      this.client.setCredentials(tokens)

      // Fetch user profile
      const res = await this.client.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo',
      })

      return res.data // { sub, name, given_name, family_name, picture, email, email_verified, locale }
    } catch (error) {
      console.error('Google OAuth Error:', error)
      return null
    }
  }
}

module.exports = GoogleOAuthService
