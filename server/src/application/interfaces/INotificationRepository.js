class INotificationRepository {
  async create(data) { throw new Error('Not implemented') }
  async createMany(dataArray) { throw new Error('Not implemented') }
  async findByUserId(userId, { unreadOnly, page, limit } = {}) { throw new Error('Not implemented') }
  async markAsRead(id, userId) { throw new Error('Not implemented') }
  async markAllAsRead(userId) { throw new Error('Not implemented') }
  async countUnread(userId) { throw new Error('Not implemented') }
}

module.exports = INotificationRepository
