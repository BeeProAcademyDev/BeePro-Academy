class EnrollInCourseUseCase {
  constructor({ enrollmentRepository }) {
    this.enrollmentRepository = enrollmentRepository;
  }

  async execute({ courseId, userId }) {
    if (!courseId || !userId)
      throw new Error("courseId and userId are required");
    return await this.enrollmentRepository.enrollStudentIfEligible(
      courseId,
      userId,
    );
  }
}

module.exports = EnrollInCourseUseCase;
