const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const ITokenService = require('../../application/interfaces/ITokenService')

class JwtTokenService extends ITokenService {
  constructor({ config }) {
    super()
    this.secret = config.jwtSecret
    this.accessExpiry = config.jwtAccessExpiry
  }

  generateAccessToken(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.accessExpiry,
    })
  }

  generateRefreshToken() {
    // Refresh tokens are just opaque random strings stored in the DB
    return crypto.randomBytes(40).toString('hex')
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.secret)
    } catch (err) {
      return null
    }
  }
}

module.exports = JwtTokenService
