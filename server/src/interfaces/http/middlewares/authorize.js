const { AuthorizationError } = require('../../../domain/errors/AppError')

/**
 * Express middleware to enforce role-based access control.
 * Must be used AFTER the authenticate middleware.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required'))
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return next(new AuthorizationError('You do not have permission to perform this action'))
    }

    if (req.user.status !== 'active') {
      return next(new AuthorizationError('Your account must be active to perform this action. If you are pending, please wait for admin approval.'))
    }

    next()
  }
}

module.exports = authorize
