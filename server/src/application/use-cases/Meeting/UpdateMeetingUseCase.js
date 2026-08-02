const Meeting = require('../../../domain/entities/Meeting')
const { AuthorizationError, NotFoundError, ValidationError } = require('../../../domain/errors/AppError')

class UpdateMeetingUseCase {
  constructor({ meetingRepository, courseRepository, sectionRepository, lessonRepository }) {
    this.meetingRepository = meetingRepository
    this.courseRepository = courseRepository
    this.sectionRepository = sectionRepository
    this.lessonRepository = lessonRepository
  }

  async execute({ meetingId, title, scheduledAt, durationMinutes, status, userId, userRole }) {
    // 1. Find meeting
    const meeting = await this.meetingRepository.findById(meetingId)
    if (!meeting) {
      throw new NotFoundError('Meeting')
    }

    // 2. Authorization
    if (userRole !== 'admin' && meeting.instructor_id !== userId) {
      throw new AuthorizationError('You do not have permission to update this meeting')
    }

    // 3. If updating details other than status, ensure meeting is not completed/cancelled
    if ((title || scheduledAt || durationMinutes) && (meeting.status === 'completed' || meeting.status === 'cancelled')) {
      throw new ValidationError('Cannot modify details of a completed or cancelled meeting')
    }

    // 4. Validate new scheduled date if provided
    if (scheduledAt) {
      const dateCheck = Meeting.validateScheduledAt(scheduledAt)
      if (!dateCheck.valid) {
        throw new ValidationError(dateCheck.message)
      }
    }

    // 5. Update
    const updateData = {}
    if (title) updateData.title = title
    if (scheduledAt) updateData.scheduled_at = new Date(scheduledAt)
    if (durationMinutes) updateData.duration_minutes = durationMinutes
    if (status) updateData.status = status

    return this.meetingRepository.update(meetingId, updateData)
  }
}

module.exports = UpdateMeetingUseCase
