class MarkAllNotificationsReadUseCase {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository
  }

  async execute({ userId }) {
    await this.notificationRepository.markAllAsRead(userId)
    return { success: true }
  }
}

module.exports = MarkAllNotificationsReadUseCase
