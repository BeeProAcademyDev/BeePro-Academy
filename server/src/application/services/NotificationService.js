/**
 * NotificationService - Domain service that fans out notifications to enrolled students.
 * This is called by use cases (CreateLesson, CreateAssessment, CreateMeeting, etc.)
 * to automatically notify all enrolled students of a course.
 */
class NotificationService {
  constructor({ notificationRepository, enrollmentRepository }) {
    this.notificationRepository = notificationRepository
    this.enrollmentRepository = enrollmentRepository
  }

  /**
   * Finds all students enrolled in a course and returns their user IDs.
   */
  async _getEnrolledStudentIds(courseId) {
    const enrollments = await this.enrollmentRepository.findByCourseId(courseId)
    if (!enrollments || enrollments.length === 0) return []
    return enrollments.map(e => e.user_id)
  }

  /**
   * Creates notifications in bulk for a list of user IDs.
   */
  async _notifyUsers(userIds, { type, title, message, metadata }) {
    if (!userIds || userIds.length === 0) return

    const notifications = userIds.map(userId => ({
      user_id: userId,
      type,
      title,
      message,
      metadata
    }))

    await this.notificationRepository.createMany(notifications)
  }

  /**
   * Notify enrolled students that a new lesson has been added.
   */
  async notifyNewLesson(courseId, lessonTitle, courseTitle) {
    const studentIds = await this._getEnrolledStudentIds(courseId)
    await this._notifyUsers(studentIds, {
      type: 'new_lesson',
      title: 'New Lesson Available',
      message: `A new lesson "${lessonTitle}" has been added to "${courseTitle}".`,
      metadata: {
        courseName: courseTitle,
        lessonName: lessonTitle,
        courseId
      }
    })
  }

  /**
   * Notify enrolled students that a new quiz or assignment has been added.
   */
  async notifyNewAssessment(courseId, lessonId, assessmentTitle, assessmentType, courseTitle, lessonTitle) {
    const studentIds = await this._getEnrolledStudentIds(courseId)
    const typeLabel = assessmentType === 'quiz' ? 'Quiz' : 'Assignment'
    const lessonInfo = lessonTitle ? ` - ${lessonTitle}` : ''
    await this._notifyUsers(studentIds, {
      type: 'new_assessment',
      title: `New ${typeLabel} Available`,
      message: `A new ${typeLabel.toLowerCase()} "${assessmentTitle}" has been added to "${courseTitle}"${lessonInfo}.`,
      metadata: {
        courseName: courseTitle,
        lessonName: lessonTitle || null,
        assessmentTitle,
        courseId,
        lessonId
      }
    })
  }

  /**
   * Notify enrolled students that a new meeting/session has been scheduled.
   */
  async notifyNewMeeting(courseId, lessonId, meetingTitle, scheduledAt, courseTitle, lessonTitle) {
    const studentIds = await this._getEnrolledStudentIds(courseId)
    const dateStr = new Date(scheduledAt).toLocaleString()
    await this._notifyUsers(studentIds, {
      type: 'new_meeting',
      title: 'New Live Session Scheduled',
      message: `A live session "${meetingTitle}" has been scheduled for ${dateStr} in "${courseTitle}" - ${lessonTitle}.`,
      metadata: {
        courseName: courseTitle,
        lessonName: lessonTitle,
        meetingTitle,
        scheduledAt,
        courseId,
        lessonId
      }
    })
  }

  /**
   * Notify students who submitted that grades are now public.
   */
  async notifyGradesPublished(assessmentId, assessmentTitle, courseTitle, submitterUserIds, lessonTitle) {
    await this._notifyUsers(submitterUserIds, {
      type: 'grades_published',
      title: 'Grades Published',
      message: `Grades for "${assessmentTitle}" in "${courseTitle}" are now available.`,
      metadata: {
        courseName: courseTitle,
        lessonName: lessonTitle || null,
        assessmentTitle,
        assessmentId
      }
    })
  }

  /**
   * Notify students who submitted that review/answers are now allowed.
   */
  async notifyReviewAllowed(assessmentId, assessmentTitle, courseTitle, submitterUserIds, lessonTitle) {
    await this._notifyUsers(submitterUserIds, {
      type: 'review_allowed',
      title: 'Review Now Available',
      message: `You can now review your answers for "${assessmentTitle}" in "${courseTitle}".`,
      metadata: {
        courseName: courseTitle,
        lessonName: lessonTitle || null,
        assessmentTitle,
        assessmentId
      }
    })
  }
}

module.exports = NotificationService
