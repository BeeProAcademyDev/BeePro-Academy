class LessonProgress {
  constructor({
    id,
    user_id,
    lesson_id,
    course_id,
    is_completed = false,
    watch_time_seconds = 0,
    completion_percentage = 0,
    last_accessed_at,
  }) {
    this.id = id;
    this.userId = user_id;
    this.lessonId = lesson_id;
    this.courseId = course_id;
    this.isCompleted = is_completed;
    this.watchTimeSeconds = watch_time_seconds;
    this.completionPercentage = completion_percentage;
    this.lastAccessedAt = last_accessed_at;
  }
}

module.exports = LessonProgress;
