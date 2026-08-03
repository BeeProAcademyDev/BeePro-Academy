const { Router } = require('express')
const validate = require('../middlewares/validate')
const { createCategorySchema, updateCategorySchema } = require('../validators/categoryValidators')

function createCategoryRoutes(categoryController, authenticate, authorize) {
  const router = Router()

  router.get('/', categoryController.getAll)

  // Admin routes
  router.use(authenticate, authorize('admin'))
  
  router.post('/', validate(createCategorySchema), categoryController.create)
  router.patch('/:id', validate(updateCategorySchema), categoryController.update)
  router.delete('/:id', categoryController.delete)

  return router
}

module.exports = createCategoryRoutes
