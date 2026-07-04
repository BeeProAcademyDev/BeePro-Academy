class ListLessonsByCourseUseCase {
  constructor({ lessonRepository }) {
    this.lessonRepository = lessonRepository;
  }

  async execute({ courseId }) {
    if (!courseId) throw new Error("courseId is required");
    return await this.lessonRepository.listByCourse(courseId);
  }
}

module.exports = ListLessonsByCourseUseCase;
