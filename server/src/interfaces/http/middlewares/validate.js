const { ValidationError } = require('../../../domain/errors/AppError')

/**
 * Express middleware to validate request against a Zod schema.
 */
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    })
    next()
  } catch (error) {
    if (error.name === 'ZodError') {
      const details = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      next(new ValidationError('Validation failed', details))
    } else {
      next(error)
    }
  }
}

module.exports = validate
