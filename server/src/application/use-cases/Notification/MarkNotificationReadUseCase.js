class MarkNotificationReadUseCase {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository
  }

  async execute({ notificationId, userId }) {
    await this.notificationRepository.markAsRead(notificationId, userId)
    return { success: true }
  }
}

module.exports = MarkNotificationReadUseCase
