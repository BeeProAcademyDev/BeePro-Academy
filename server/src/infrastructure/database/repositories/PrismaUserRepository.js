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

  async findByStatus(status) {
    return this.prisma.user.findMany({
      where: { status },
      orderBy: { created_at: 'desc' },
    })
  }

  async findByRoleAndStatus(role, status) {
    return this.prisma.user.findMany({
      where: { role, status },
      orderBy: { created_at: 'desc' },
    })
  }

  async findAll({ page = 1, limit = 20, role, status, search } = {}) {
    const where = {}

    if (role) where.role = role
    if (status) where.status = status
    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ])

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async delete(id) {
    return this.prisma.user.delete({
      where: { id },
    })
  }
}

module.exports = PrismaUserRepository
