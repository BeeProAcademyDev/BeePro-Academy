const ITokenRepository = require('../../../application/interfaces/ITokenRepository')

class PrismaTokenRepository extends ITokenRepository {
  constructor({ prisma }) {
    super()
    this.prisma = prisma
  }

  async create(tokenData) {
    return this.prisma.refreshToken.create({
      data: tokenData,
    })
  }

  async findByToken(token) {
    return this.prisma.refreshToken.findUnique({
      where: { token },
    })
  }

  async deleteByToken(token) {
    return this.prisma.refreshToken.delete({
      where: { token },
    })
  }

  async deleteAllForUser(userId) {
    return this.prisma.refreshToken.deleteMany({
      where: { user_id: userId },
    })
  }

  async deleteExpired() {
    return this.prisma.refreshToken.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    })
  }
}

module.exports = PrismaTokenRepository
