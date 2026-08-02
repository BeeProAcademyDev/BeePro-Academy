const { v4: uuidv4 } = require('uuid')

class Meeting {
  constructor({ id, lessonId, instructorId, title, scheduledAt, durationMinutes, status, jitsiRoomId, createdAt, updatedAt }) {
    this.id = id
    this.lessonId = lessonId
    this.instructorId = instructorId
    this.title = title
    this.scheduledAt = scheduledAt
    this.durationMinutes = durationMinutes
    this.status = status || 'scheduled'
    this.jitsiRoomId = jitsiRoomId
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  /**
   * Generates a unique, unguessable Jitsi room ID.
   * Format: "beepro-{uuid}" — this acts as the security key since we use meet.jit.si
   */
  static generateJitsiRoomId() {
    return `beepro-${uuidv4()}`
  }

  /**
   * Validates that the scheduled date is in the future.
   */
  static validateScheduledAt(date) {
    const scheduledDate = new Date(date)
    if (isNaN(scheduledDate.getTime())) {
      return { valid: false, message: 'Invalid date format' }
    }
    if (scheduledDate <= new Date()) {
      return { valid: false, message: 'Scheduled date must be in the future' }
    }
    return { valid: true }
  }
}

module.exports = Meeting
