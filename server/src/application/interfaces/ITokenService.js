/**
 * ITokenService — Port for JWT token operations.
 */
class ITokenService {
  generateAccessToken(payload) {
    throw new Error('ITokenService.generateAccessToken() not implemented')
  }

  generateRefreshToken() {
    throw new Error('ITokenService.generateRefreshToken() not implemented')
  }

  verifyAccessToken(token) {
    throw new Error('ITokenService.verifyAccessToken() not implemented')
  }
}

module.exports = ITokenService
