/**
 * Express middleware to optionally extract JWT from Authorization header and attach user payload to req.user.
 * If no token is provided or the token is invalid, it simply proceeds without setting req.user.
 */
const optionalAuthenticate = (tokenService) => (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = tokenService.verifyAccessToken(token)

      if (decoded) {
        req.user = {
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          status: decoded.status,
        }
      }
    }
  } catch (err) {
    // Ignore invalid tokens, just leave req.user undefined
  }

  next()
}

module.exports = optionalAuthenticate
