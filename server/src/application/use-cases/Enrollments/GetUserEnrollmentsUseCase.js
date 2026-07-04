class GetUserEnrollmentsUseCase {
  constructor({ enrollmentRepository }) {
    this.enrollmentRepository = enrollmentRepository;
  }

  async execute({ userId }) {
    if (!userId) throw new Error("userId is required");
    return await this.enrollmentRepository.getUserEnrollments(userId);
  }
}

module.exports = GetUserEnrollmentsUseCase;
