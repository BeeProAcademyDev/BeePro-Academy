const bcrypt = require('bcryptjs')
const IHashService = require('../../application/interfaces/IHashService')

class BcryptHashService extends IHashService {
  constructor() {
    super()
    this.saltRounds = 12
  }

  async hash(plainText) {
    return bcrypt.hash(plainText, this.saltRounds)
  }

  async compare(plainText, hash) {
    if (!hash) return false
    return bcrypt.compare(plainText, hash)
  }
}

module.exports = BcryptHashService
