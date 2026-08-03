class NotificationController {
  constructor({
    getMyNotificationsUseCase,
    markNotificationReadUseCase,
    markAllNotificationsReadUseCase,
    getUnreadCountUseCase
  }) {
    this.getMyNotificationsUseCase = getMyNotificationsUseCase
    this.markNotificationReadUseCase = markNotificationReadUseCase
    this.markAllNotificationsReadUseCase = markAllNotificationsReadUseCase
    this.getUnreadCountUseCase = getUnreadCountUseCase
  }

  getMyNotifications = async (req, res, next) => {
    try {
      const { unreadOnly, page, limit } = req.query
      const result = await this.getMyNotificationsUseCase.execute({
        userId: req.user.id,
        unreadOnly: unreadOnly === 'true',
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      })
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  getUnreadCount = async (req, res, next) => {
    try {
      const result = await this.getUnreadCountUseCase.execute({ userId: req.user.id })
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  markAsRead = async (req, res, next) => {
    try {
      const { notificationId } = req.params
      const result = await this.markNotificationReadUseCase.execute({
        notificationId,
        userId: req.user.id
      })
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  markAllAsRead = async (req, res, next) => {
    try {
      const result = await this.markAllNotificationsReadUseCase.execute({ userId: req.user.id })
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = NotificationController
