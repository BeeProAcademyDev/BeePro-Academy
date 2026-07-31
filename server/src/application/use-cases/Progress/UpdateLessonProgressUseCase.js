const { AppError, NotFoundError } = require('../../../domain/errors/AppError');

class UpdateLessonProgressUseCase {
  constructor({ lessonProgressRepository, enrollmentRepository, lessonRepository, sectionRepository }) {
    this.lessonProgressRepository = lessonProgressRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.lessonRepository = lessonRepository;
    this.sectionRepository = sectionRepository;
  }

  async execute(userId, lessonId, data) {
    const { is_completed, watch_time_seconds, completion_percentage, course_id } = data;

    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new NotFoundError('Lesson');
    }

    let courseId = course_id;
    if (!courseId) {
       const section = await this.sectionRepository.findById(lesson.section_id);
       if (!section) throw new NotFoundError('Section');
       courseId = section.course_id;
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);
    if (!enrollment) {
      throw new AppError('User is not enrolled in this course', 400, 'BAD_REQUEST');
    }

    if (is_completed) {
      if (lesson.requires_passing_quiz || lesson.requires_passing_assignment) {
        // TODO: Call Assessment Module to verify if user has passed the quiz/assignment
        throw new AppError('This lesson requires passing a quiz/assignment. Automatic completion will be handled by the Assessment module.', 400, 'BAD_REQUEST');
      }
    }

    let progress = await this.lessonProgressRepository.findByUserAndLesson(userId, lessonId);
    let wasCompleted = progress ? progress.isCompleted : false;

    if (progress) {
      progress = await this.lessonProgressRepository.update(progress.id, {
        is_completed: is_completed !== undefined ? is_completed : progress.isCompleted,
        watch_time_seconds: watch_time_seconds !== undefined ? watch_time_seconds : progress.watchTimeSeconds,
        completion_percentage: completion_percentage !== undefined ? completion_percentage : progress.completionPercentage,
        last_accessed_at: new Date()
      });
    } else {
      progress = await this.lessonProgressRepository.create({
        user_id: userId,
        lesson_id: lessonId,
        course_id: courseId,
        is_completed: is_completed || false,
        watch_time_seconds: watch_time_seconds || 0,
        completion_percentage: completion_percentage || 0,
        last_accessed_at: new Date()
      });
    }

    // Update enrollment progress
    const nowCompleted = progress.is_completed;
    if (!wasCompleted && nowCompleted) {
      const completed_lessons = enrollment.completed_lessons + 1;
      const progress_percent = Math.round((completed_lessons / enrollment.total_lessons) * 100) || 0;
      
      await this.enrollmentRepository.update(enrollment.id, {
        completed_lessons,
        progress: progress_percent > 100 ? 100 : progress_percent,
        last_accessed_at: new Date()
      });
    } else {
      await this.enrollmentRepository.update(enrollment.id, {
        last_accessed_at: new Date()
      });
    }

    return progress;
  }
}

module.exports = UpdateLessonProgressUseCase;
