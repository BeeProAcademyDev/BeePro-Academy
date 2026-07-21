const { Router } = require('express')

/**
 * Admin routes — all protected by authenticate + authorize('admin')
 */
function createAdminRoutes(adminController, authenticate, authorize) {
  const router = Router()

  // All admin routes require authentication + admin role
  router.use(authenticate)
  router.use(authorize('admin'))

  // User management
  router.get('/users', adminController.getAllUsers)
  router.get('/users/pending', adminController.getPendingInstructors)

  // User status management
  router.patch('/users/:id/approve', adminController.approveInstructor)
  router.patch('/users/:id/reject', adminController.rejectInstructor)
  router.patch('/users/:id/suspend', adminController.suspendUser)
  router.patch('/users/:id/activate', adminController.activateUser)

  // Delete user
  router.delete('/users/:id', adminController.deleteUser)

  return router
}

module.exports = createAdminRoutes
