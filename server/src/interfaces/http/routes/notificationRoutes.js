const { Router } = require('express')

function createNotificationRoutes(notificationController, authenticate) {
  const router = Router()

  // All notification routes require authentication
  router.use(authenticate)

  // GET /api/v1/notifications -> paginated notifications list
  router.get('/', notificationController.getMyNotifications)

  // GET /api/v1/notifications/unread-count -> count for bell badge
  router.get('/unread-count', notificationController.getUnreadCount)

  // PATCH /api/v1/notifications/read-all -> mark all as read
  router.patch('/read-all', notificationController.markAllAsRead)

  // PATCH /api/v1/notifications/:notificationId/read -> mark single as read
  router.patch('/:notificationId/read', notificationController.markAsRead)

  return router
}

module.exports = createNotificationRoutes
