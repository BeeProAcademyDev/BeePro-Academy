/**
 * IHashService — Port for password hashing.
 */
class IHashService {
  async hash(plainText) {
    throw new Error('IHashService.hash() not implemented')
  }

  async compare(plainText, hash) {
    throw new Error('IHashService.compare() not implemented')
  }
}

module.exports = IHashService
