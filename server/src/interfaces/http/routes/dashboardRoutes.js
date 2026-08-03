const { Router } = require('express')

function createDashboardRoutes(dashboardController, authenticate, authorize) {
  const router = Router()

  router.use(authenticate)

  router.get('/student', authorize('student'), dashboardController.getStudentDashboardStats)
  router.get('/instructor', authorize('instructor'), dashboardController.getTeacherDashboardStats)
  router.get('/admin', authorize('admin'), dashboardController.getAdminDashboardStats)

  return router
}

module.exports = createDashboardRoutes