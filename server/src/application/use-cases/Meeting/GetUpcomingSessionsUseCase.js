class GetUpcomingSessionsUseCase {
  constructor({ meetingRepository }) {
    this.meetingRepository = meetingRepository
  }

  async execute({ instructorId }) {
    const meetings = await this.meetingRepository.findUpcomingByInstructorId(instructorId)
    
    // Map to a cleaner dashboard format
    return meetings.map(m => ({
      id: m.id,
      title: m.title,
      scheduledAt: m.scheduled_at,
      durationMinutes: m.duration_minutes,
      status: m.status,
      lessonTitle: m.lesson?.title,
      courseTitle: m.lesson?.section?.course?.title,
      courseId: m.lesson?.section?.course?.id
    }))
  }
}

module.exports = GetUpcomingSessionsUseCase
