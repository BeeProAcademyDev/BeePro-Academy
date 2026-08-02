const Meeting = require('../../../domain/entities/Meeting')
const { AuthorizationError, NotFoundError, ValidationError, ConflictError } = require('../../../domain/errors/AppError')

class CreateMeetingUseCase {
  constructor({ meetingRepository, lessonRepository, sectionRepository, courseRepository, enrollmentRepository, notificationService }) {
    this.meetingRepository = meetingRepository
    this.lessonRepository = lessonRepository
    this.sectionRepository = sectionRepository
    this.courseRepository = courseRepository
    this.enrollmentRepository = enrollmentRepository
    this.notificationService = notificationService
  }

  async execute({ lessonId, title, scheduledAt, durationMinutes, userId, userRole }) {
    // 1. Validate scheduled date
    const dateCheck = Meeting.validateScheduledAt(scheduledAt)
    if (!dateCheck.valid) {
      throw new ValidationError(dateCheck.message)
    }

    // 2. Verify lesson exists
    const lesson = await this.lessonRepository.findById(lessonId)
    if (!lesson) {
      throw new NotFoundError('Lesson')
    }

    // 3. Get the course via section to check ownership
    const section = await this.sectionRepository.findById(lesson.section_id)
    if (!section) {
      throw new NotFoundError('Section')
    }

    const course = await this.courseRepository.findById(section.course_id)
    if (!course) {
      throw new NotFoundError('Course')
    }

    // 4. Authorization: must be the instructor of this course or admin
    if (userRole !== 'admin') {
      const instructorId = course.instructor_id || course.instructorId
      if (instructorId !== userId) {
        throw new AuthorizationError('You do not have permission to create a meeting for this course')
      }
    }

    // 5. Check if lesson already has a meeting
    const existingMeeting = await this.meetingRepository.findByLessonId(lessonId)
    if (existingMeeting) {
      throw new ConflictError('This lesson already has a meeting scheduled')
    }

    // 6. Generate unguessable Jitsi room ID
    const jitsiRoomId = Meeting.generateJitsiRoomId()

    // 7. Create the meeting
    const meeting = await this.meetingRepository.create({
      lesson_id: lessonId,
      instructor_id: userId,
      title,
      scheduled_at: new Date(scheduledAt),
      duration_minutes: durationMinutes || 60,
      status: 'scheduled',
      jitsi_room_id: jitsiRoomId
    })

    // 8. Send notifications to enrolled students
    if (this.notificationService) {
      await this.notificationService.notifyNewMeeting(
        course.id,
        lessonId,
        title,
        scheduledAt,
        course.title,
        lesson.title
      )
    }

    return meeting
  }
}

module.exports = CreateMeetingUseCase
