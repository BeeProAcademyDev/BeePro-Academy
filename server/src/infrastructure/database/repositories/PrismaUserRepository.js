const IUserRepository = require('../../../application/interfaces/IUserRepository')

class PrismaUserRepository extends IUserRepository {
  constructor({ prisma }) {
    super()
    this.prisma = prisma
  }

  async findById(id) {
    return this.prisma.user.findUnique({
      where: { id },
    })
  }

  async findByEmail(email) {
    return this.prisma.user.findUnique({
      where: { email },
    })
  }

  async create(userData) {
    return this.prisma.user.create({
      data: userData,
    })
  }

  async update(id, data) {
    return this.prisma.user.update({
      where: { id },
      data,
    })
  }

  async updatePassword(id, passwordHash) {
    return this.prisma.user.update({
      where: { id },
      data: { password_hash: passwordHash },
    })
  }

  async setResetToken(id, hashedToken, expiresAt) {
    return this.prisma.user.update({
      where: { id },
      data: {
        reset_token: hashedToken,
        reset_token_exp: expiresAt,
      },
    })
  }

  async clearResetToken(id) {
    return this.prisma.user.update({
      where: { id },
      data: {
        reset_token: null,
        reset_token_exp: null,
      },
    })
  }
}

module.exports = PrismaUserRepository
