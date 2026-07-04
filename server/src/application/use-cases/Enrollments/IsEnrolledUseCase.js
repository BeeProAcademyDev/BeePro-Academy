class IsEnrolledUseCase {
  constructor({ enrollmentRepository }) {
    this.enrollmentRepository = enrollmentRepository;
  }

  async execute({ userId, courseId }) {
    if (!userId || !courseId)
      throw new Error("userId and courseId are required");
    return await this.enrollmentRepository.isEnrolled(userId, courseId);
  }
}

module.exports = IsEnrolledUseCase;
