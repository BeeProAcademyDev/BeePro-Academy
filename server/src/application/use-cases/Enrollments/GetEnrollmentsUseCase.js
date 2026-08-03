class GetEnrollmentsUseCase {
  constructor({ enrollmentRepository }) {
    this.enrollmentRepository = enrollmentRepository;
  }

  async execute(userId) {
    return this.enrollmentRepository.findByUserId(userId);
  }
}

module.exports = GetEnrollmentsUseCase;
