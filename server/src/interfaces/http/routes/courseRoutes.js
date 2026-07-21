const { Router } = require('express')
const validate = require('../middlewares/validate')
const { createCourseSchema, updateCourseSchema } = require('../validators/courseValidators')

function createCourseRoutes(courseController, authenticate, authorize, optionalAuthenticate) {
  const router = Router()

  // ── Public Routes ──
  // Anyone can view the list of published courses
  router.get('/', courseController.getAllCourses)

  // ── Instructor Routes (Must come BEFORE /:id to avoid matching 'instructor' as an ID) ──
  router.get('/instructor/my', authenticate, authorize('instructor', 'admin'), courseController.getInstructorCourses)

  // ── Mixed Auth Route ──
  // Getting a course by ID. If public, only sees published. If instructor, sees own drafts.
  router.get('/:id', optionalAuthenticate, courseController.getCourseById)

  // ── Protected Instructor Routes ──
  router.use(authenticate)
  
  router.post('/', authorize('instructor', 'admin'), validate(createCourseSchema), courseController.createCourse)
  router.patch('/:id', authorize('instructor', 'admin'), validate(updateCourseSchema), courseController.updateCourse)
  router.delete('/:id', authorize('instructor', 'admin'), courseController.deleteCourse)

  return router
}

module.exports = createCourseRoutes
