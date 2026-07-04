const { Router } = require('express')
const validate = require('../middlewares/validate')
const { authLimiter } = require('../middlewares/rateLimiter')
const validators = require('../validators/authValidators')

function createAuthRoutes(authController, authenticate, authorize) {
  const router = Router()

  // Apply rate limiting to all auth routes
  router.use(authLimiter)

  // Public routes
  router.post('/register', validate(validators.registerSchema), authController.register)
  router.post('/login', validate(validators.loginSchema), authController.login)
  router.post('/refresh-token', validate(validators.refreshTokenSchema), authController.refreshToken)
  router.post('/forgot-password', validate(validators.forgotPasswordSchema), authController.forgotPassword)
  router.post('/reset-password', validate(validators.resetPasswordSchema), authController.resetPassword)

  // Google OAuth
  router.get('/google', authController.googleAuth)
  router.get('/google/callback', authController.googleCallback)

  // Authenticated routes
  router.post('/logout', authenticate, authController.logout)
  router.get('/me', authenticate, authController.getProfile)
  router.patch('/me', authenticate, validate(validators.updateProfileSchema), authController.updateProfile)

  // Example of role-based route (Admins only)
  // router.delete('/users/:id', authenticate, authorize('admin'), userController.deleteUser)

  return router
}

module.exports = createAuthRoutes
