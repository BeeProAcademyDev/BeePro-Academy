const { Router } = require('express')
const validate = require('../middlewares/validate')
const { createLessonSchema, updateLessonSchema, addLessonFileSchema } = require('../validators/lessonValidators')

function createLessonRoutes(lessonController, authenticate, authorize, optionalAuthenticate) {
  const router = Router({ mergeParams: true })

  // Public/Student routes
  router.get('/', optionalAuthenticate, lessonController.getSectionLessons)

  // Protected Instructor Routes
  router.use(authenticate, authorize('instructor', 'admin'))

  router.post('/', validate(createLessonSchema), lessonController.create)
  router.patch('/:lessonId', validate(updateLessonSchema), lessonController.update)
  router.delete('/:lessonId', lessonController.delete)

  // Lesson Files
  router.post('/:lessonId/files', validate(addLessonFileSchema), lessonController.addFile)
  router.delete('/files/:fileId', lessonController.deleteFile) // Uses /files/:fileId directly to avoid deep nesting

  return router
}

module.exports = createLessonRoutes
