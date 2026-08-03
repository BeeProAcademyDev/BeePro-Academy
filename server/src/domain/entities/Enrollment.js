class Enrollment {
  constructor({
    id,
    user_id,
    course_id,
    progress = 0,
    total_lessons = 0,
    completed_lessons = 0,
    last_accessed_at,
    enrolled_at,
  }) {
    this.id = id;
    this.userId = user_id;
    this.courseId = course_id;
    this.progress = progress;
    this.totalLessons = total_lessons;
    this.completedLessons = completed_lessons;
    this.lastAccessedAt = last_accessed_at;
    this.enrolledAt = enrolled_at;
  }
}

module.exports = Enrollment;
