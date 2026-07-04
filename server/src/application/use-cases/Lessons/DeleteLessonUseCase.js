class DeleteLessonUseCase {
  constructor({ lessonRepository }) {
    this.lessonRepository = lessonRepository;
  }

  async execute({ id }) {
    if (!id) throw new Error("id is required");
    return await this.lessonRepository.delete(id);
  }
}

module.exports = DeleteLessonUseCase;
