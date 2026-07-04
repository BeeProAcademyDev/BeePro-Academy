/**
 * RefreshToken Entity — Pure domain model.
 */
class RefreshToken {
  constructor({ id, token, userId, expiresAt, createdAt = new Date() }) {
    this.id = id
    this.token = token
    this.userId = userId
    this.expiresAt = expiresAt
    this.createdAt = createdAt
  }

  isExpired() {
    return new Date() > new Date(this.expiresAt)
  }

  isValid() {
    return !this.isExpired()
  }
}

module.exports = RefreshToken
