class UpdateLessonProgressUseCase {
  constructor({
    lessonProgressRepository,
    enrollmentRepository,
    lessonRepository,
    sectionRepository,
    assessmentRepository,
    assessmentSubmissionRepository
  }) {
    this.lessonProgressRepository = lessonProgressRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.lessonRepository = lessonRepository;
    this.sectionRepository = sectionRepository;
    this.assessmentRepository = assessmentRepository;
    this.assessmentSubmissionRepository = assessmentSubmissionRepository;
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

    // Check prerequisites if the student is marking the lesson as completed
    if (is_completed) {
      const requiresQuiz = !!lesson.requires_passing_quiz;
      const requiresAssignment = !!lesson.requires_passing_assignment;

      if (requiresQuiz || requiresAssignment) {
        let assessments = [];
        if (this.assessmentRepository) {
          assessments = await this.assessmentRepository.findByLessonId(lessonId);
        }

        // 1. Verify Quiz requirement
        if (requiresQuiz) {
          const publishedQuizzes = assessments.filter(a => a.type === 'quiz' && a.status === 'published');
          for (const quiz of publishedQuizzes) {
            let submission = null;
            if (this.assessmentSubmissionRepository) {
              submission = await this.assessmentSubmissionRepository.findByUserAndAssessment(userId, quiz.id);
            }
            const isPassed = submission && (submission.status === 'submitted' || submission.status === 'graded' || submission.status === 'pending_review');
            if (!isPassed) {
              throw new AppError(
                `You must complete and submit the quiz "${quiz.title}" before finishing this lesson.`,
                400,
                'QUIZ_REQUIRED'
              );
            }
          }
        }

        // 2. Verify Assignment requirement
        if (requiresAssignment) {
          const publishedAssignments = assessments.filter(a => a.type === 'assignment' && a.status === 'published');
          for (const assignment of publishedAssignments) {
            let submission = null;
            if (this.assessmentSubmissionRepository) {
              submission = await this.assessmentSubmissionRepository.findByUserAndAssessment(userId, assignment.id);
            }
            const isPassed = submission && (submission.status === 'submitted' || submission.status === 'graded' || submission.status === 'pending_review');
            if (!isPassed) {
              throw new AppError(
                `You must submit the assignment "${assignment.title}" before finishing this lesson.`,
                400,
                'ASSIGNMENT_REQUIRED'
              );
            }
          }
        }
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
