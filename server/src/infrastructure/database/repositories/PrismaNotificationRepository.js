const INotificationRepository = require('../../../application/interfaces/INotificationRepository')

class PrismaNotificationRepository extends INotificationRepository {
  constructor({ prisma }) {
    super()
    this.prisma = prisma
  }

  async create(data) {
    return this.prisma.notification.create({ data })
  }

  async createMany(dataArray) {
    return this.prisma.notification.createMany({ data: dataArray })
  }

  async findByUserId(userId, { unreadOnly = false, page = 1, limit = 20 } = {}) {
    const where = { user_id: userId }
    if (unreadOnly) where.is_read = false

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.notification.count({ where })
    ])

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async markAsRead(id, userId) {
    return this.prisma.notification.updateMany({
      where: { id, user_id: userId },
      data: { is_read: true }
    })
  }

  async markAllAsRead(userId) {
    return this.prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true }
    })
  }

  async countUnread(userId) {
    return this.prisma.notification.count({
      where: { user_id: userId, is_read: false }
    })
  }
}

module.exports = PrismaNotificationRepository
