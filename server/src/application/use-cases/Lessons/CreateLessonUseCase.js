class CreateLessonUseCase {
  constructor({ lessonRepository }) {
    this.lessonRepository = lessonRepository;
  }

  async execute({ data }) {
    if (!data) throw new Error("data is required");
    return await this.lessonRepository.create(data);
  }
}

module.exports = CreateLessonUseCase;
