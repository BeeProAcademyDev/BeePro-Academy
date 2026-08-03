class GetMyNotificationsUseCase {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository
  }

  async execute({ userId, unreadOnly = false, page = 1, limit = 20 }) {
    const result = await this.notificationRepository.findByUserId(userId, { unreadOnly, page, limit })

    // Format each notification with top-level course_name and lesson_name
    const formattedNotifications = result.notifications.map(n => {
      const meta = (typeof n.metadata === 'object' && n.metadata !== null) ? n.metadata : {}
      return {
        id: n.id,
        user_id: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        course_name: meta.courseName || meta.course_name || null,
        lesson_name: meta.lessonName || meta.lesson_name || null,
        is_read: n.is_read,
        metadata: meta,
        created_at: n.created_at
      }
    })

    return {
      notifications: formattedNotifications,
      pagination: result.pagination
    }
  }
}

module.exports = GetMyNotificationsUseCase
