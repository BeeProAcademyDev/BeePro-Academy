class ProgressController {
  constructor({
    enrollInCourseUseCase,
    updateLessonProgressUseCase,
    getCourseProgressUseCase,
    getEnrollmentsUseCase,
  }) {
    this.enrollInCourseUseCase = enrollInCourseUseCase;
    this.updateLessonProgressUseCase = updateLessonProgressUseCase;
    this.getCourseProgressUseCase = getCourseProgressUseCase;
    this.getEnrollmentsUseCase = getEnrollmentsUseCase;
  }

  enrollInCourse = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { courseId } = req.params;
      const enrollment = await this.enrollInCourseUseCase.execute(userId, courseId);
      res.status(201).json({
        status: 'success',
        data: { enrollment }
      });
    } catch (error) {
      next(error);
    }
  };

  updateLessonProgress = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { lessonId } = req.params;
      const data = req.body;
      const progress = await this.updateLessonProgressUseCase.execute(userId, lessonId, data);
      res.status(200).json({
        status: 'success',
        data: { progress }
      });
    } catch (error) {
      next(error);
    }
  };

  getCourseProgress = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { courseId } = req.params;
      const progressData = await this.getCourseProgressUseCase.execute(userId, courseId);
      res.status(200).json({
        status: 'success',
        data: progressData
      });
    } catch (error) {
      next(error);
    }
  };

  getEnrollments = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const enrollments = await this.getEnrollmentsUseCase.execute(userId);
      res.status(200).json({
        status: 'success',
        data: { enrollments }
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = ProgressController;
