class UpdateProgressUseCase {
  constructor({ enrollmentRepository }) {
    this.enrollmentRepository = enrollmentRepository;
  }

  async execute({ enrollmentId, progress }) {
    if (!enrollmentId) throw new Error("enrollmentId is required");
    return await this.enrollmentRepository.updateProgress(
      enrollmentId,
      progress,
    );
  }
}

module.exports = UpdateProgressUseCase;
