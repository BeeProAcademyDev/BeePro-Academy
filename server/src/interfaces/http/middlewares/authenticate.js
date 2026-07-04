const { AuthenticationError } = require('../../../domain/errors/AppError')

/**
 * Express middleware to extract JWT from Authorization header and attach user payload to req.user.
 */
const authenticate = (tokenService) => (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AuthenticationError('Authentication required. Missing or invalid token format.'))
  }

  const token = authHeader.split(' ')[1]
  const decoded = tokenService.verifyAccessToken(token)

  if (!decoded) {
    return next(new AuthenticationError('Invalid or expired token.'))
  }

  // Attach decoded payload to request
  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
  }

  next()
}

module.exports = authenticate
