class UpdateLessonUseCase {
  constructor({ lessonRepository }) {
    this.lessonRepository = lessonRepository;
  }

  async execute({ id, data }) {
    if (!id) throw new Error("id is required");
    if (!data) throw new Error("data is required");
    return await this.lessonRepository.update(id, data);
  }
}

module.exports = UpdateLessonUseCase;
