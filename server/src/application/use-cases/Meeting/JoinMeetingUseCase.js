const { AuthorizationError, NotFoundError, ValidationError } = require('../../../domain/errors/AppError')

class JoinMeetingUseCase {
  constructor({ meetingRepository, enrollmentRepository }) {
    this.meetingRepository = meetingRepository
    this.enrollmentRepository = enrollmentRepository
  }

  async execute({ meetingId, userId, userRole }) {
    // 1. Find meeting with full course data
    const meeting = await this.meetingRepository.findById(meetingId)
    if (!meeting) {
      throw new NotFoundError('Meeting')
    }

    // 2. Check meeting status
    if (meeting.status === 'completed' || meeting.status === 'cancelled') {
      throw new ValidationError(`This meeting is ${meeting.status} and can no longer be joined`)
    }

    // 3. Get course ID from the nested relation
    const courseId = meeting.lesson?.section?.course?.id
    if (!courseId) {
      throw new NotFoundError('Course associated with this meeting')
    }

    const isInstructorOrAdmin = (userRole === 'admin' || meeting.instructor_id === userId)

    // 4. Authorization check
    if (isInstructorOrAdmin) {
      // When instructor/admin joins, start the meeting if still scheduled
      if (meeting.status === 'scheduled') {
        await this.meetingRepository.update(meeting.id, { status: 'in_progress' })
      }
    } else if (userRole === 'student') {
      // Students must be enrolled in the course
      const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId)
      if (!enrollment) {
        throw new AuthorizationError('You must be enrolled in this course to join the meeting')
      }

      // Prevent student from joining before the instructor starts the session
      // This prevents students from becoming the main host / moderator in Jitsi
      if (meeting.status === 'scheduled') {
        throw new ValidationError('The instructor has not started this live session yet. Please wait for the instructor to start the meeting.')
      }
    } else {
      throw new AuthorizationError('You do not have permission to join this meeting')
    }

    // 5. Return room info and role-based Jitsi config
    const isHost = isInstructorOrAdmin
    return {
      jitsiRoomId: meeting.jitsi_room_id,
      meetingTitle: meeting.title,
      instructorName: meeting.instructor?.full_name,
      jitsiDomain: 'meet.jit.si',
      isHost,
      role: isHost ? 'moderator' : 'participant',
      configOverwrite: isHost
        ? {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableRemoteMute: false,
            disableKick: false
          }
        : {
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableRemoteMute: true,
            disableKick: true,
            toolbarButtons: [
              'microphone',
              'camera',
              'chat',
              'raisehand',
              'tileview',
              'hangup',
              'fullscreen'
            ]
          }
    }
  }
}

module.exports = JoinMeetingUseCase
