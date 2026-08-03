const { AppError } = require('../../../domain/errors/AppError')

/**
 * Global error handling middleware for Express.
 */
const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    })
  }

  // Handle SyntaxError from express.json() (invalid JSON payload)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid JSON Payload Format',
      },
    })
  }

  // Unhandled server errors — log full details
  console.error('======= UNHANDLED ERROR =======')
  console.error('Message:', err.message)
  console.error('Stack:', err.stack)
  console.error('Name:', err.name)
  if (err.code) console.error('Code:', err.code)
  if (err.meta) console.error('Meta:', JSON.stringify(err.meta, null, 2))
  console.error('================================')

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
    },
  })
}

module.exports = errorHandler
