const { Router } = require('express')
const validate = require('../middlewares/validate')
const { createSectionSchema, updateSectionSchema } = require('../validators/sectionValidators')

function createSectionRoutes(sectionController, authenticate, authorize) {
  // mergeParams: true is needed because this router will be mounted at /api/v1/courses/:courseId/sections
  const router = Router({ mergeParams: true }) 

  router.use(authenticate, authorize('instructor', 'admin'))
  
  router.post('/', validate(createSectionSchema), sectionController.create)
  
  // Notice that for update/delete we use :sectionId because :courseId is already in the mount path
  router.patch('/:sectionId', validate(updateSectionSchema), sectionController.update)
  router.delete('/:sectionId', sectionController.delete)
  router.get('',sectionController.getAll)
  return router
}

module.exports = createSectionRoutes
