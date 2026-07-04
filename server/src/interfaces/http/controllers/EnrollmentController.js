class EnrollmentController {
  constructor({
    enrollUseCase,
    getUseCase,
    isEnrolledUseCase,
    updateProgressUseCase,
  }) {
    this.enrollUseCase = enrollUseCase;
    this.getUseCase = getUseCase;
    this.isEnrolledUseCase = isEnrolledUseCase;
    this.updateProgressUseCase = updateProgressUseCase;
  }

  enroll = async (req, res, next) => {
    try {
      const { courseId } = req.body;
      const userId = req.user?.id;
      const result = await this.enrollUseCase.execute({ courseId, userId });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  getUserEnrollments = async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const result = await this.getUseCase.execute({ userId });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  isEnrolled = async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const { courseId } = req.query;
      const result = await this.isEnrolledUseCase.execute({ userId, courseId });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  updateProgress = async (req, res, next) => {
    try {
      const { enrollmentId, progress } = req.body;
      const result = await this.updateProgressUseCase.execute({
        enrollmentId,
        progress,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = EnrollmentController;
