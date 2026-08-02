const { AuthorizationError, NotFoundError } = require('../../../domain/errors/AppError')

class DeleteMeetingUseCase {
  constructor({ meetingRepository }) {
    this.meetingRepository = meetingRepository
  }

  async execute({ meetingId, userId, userRole }) {
    const meeting = await this.meetingRepository.findById(meetingId)
    if (!meeting) {
      throw new NotFoundError('Meeting')
    }

    if (userRole !== 'admin' && meeting.instructor_id !== userId) {
      throw new AuthorizationError('You do not have permission to delete this meeting')
    }

    await this.meetingRepository.delete(meetingId)
    return { success: true }
  }
}

module.exports = DeleteMeetingUseCase
