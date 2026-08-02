const { Router } = require('express')
const { validateCreateMeeting, validateUpdateMeeting } = require('../validators/meetingValidators')

function createMeetingRoutes(meetingController, authenticate, authorize, optionalAuthenticate) {
  const router = Router({ mergeParams: true })

  // Public/Student routes: get meeting info (optional authentication)
  router.get('/', optionalAuthenticate, meetingController.getLessonMeeting)

  // Protected Instructor/Admin routes
  router.post('/', authenticate, authorize('instructor', 'admin'), validateCreateMeeting, meetingController.createMeeting)
  router.put('/:meetingId', authenticate, authorize('instructor', 'admin'), validateUpdateMeeting, meetingController.updateMeeting)
  router.delete('/:meetingId', authenticate, authorize('instructor', 'admin'), meetingController.deleteMeeting)

  return router
}

function createMeetingManagementRoutes(meetingController, authenticate, authorize) {
  const router = Router()

  router.use(authenticate)

  // Instructor dashboard: upcoming sessions
  router.get('/upcoming', authorize('instructor', 'admin'), meetingController.getUpcomingSessions)

  // Join a meeting (any authenticated user, authorization is in the use case)
  router.post('/:meetingId/join', meetingController.joinMeeting)

  // Update/Delete a specific meeting
  router.put('/:meetingId', authorize('instructor', 'admin'), validateUpdateMeeting, meetingController.updateMeeting)
  router.delete('/:meetingId', authorize('instructor', 'admin'), meetingController.deleteMeeting)

  return router
}

module.exports = { createMeetingRoutes, createMeetingManagementRoutes }
