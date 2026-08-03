class GetUnreadCountUseCase {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository
  }

  async execute({ userId }) {
    const count = await this.notificationRepository.countUnread(userId)
    return { unreadCount: count }
  }
}

module.exports = GetUnreadCountUseCase
