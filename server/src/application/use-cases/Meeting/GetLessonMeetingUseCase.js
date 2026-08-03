class GetLessonMeetingUseCase {
  constructor({ meetingRepository }) {
    this.meetingRepository = meetingRepository
  }

  async execute({ lessonId, userId, userRole }) {
    const meeting = await this.meetingRepository.findByLessonId(lessonId)
    if (!meeting) {
      return null
    }

    // Only expose raw jitsi_room_id to instructor/admin.
    // Students must join via JoinMeetingUseCase to get room details.
    const isInstructorOrAdmin = userRole === 'admin' || (userId && meeting.instructor_id === userId)
    if (!isInstructorOrAdmin) {
      const { jitsi_room_id, ...safeMeeting } = meeting
      return safeMeeting
    }

    return meeting
  }
}

module.exports = GetLessonMeetingUseCase
