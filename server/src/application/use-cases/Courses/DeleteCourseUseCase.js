class DeleteCourseUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository;
  }

  async execute({ id }) {
    if (!id) throw new Error("id is required");
    return await this.courseRepository.delete(id);
  }
}

module.exports = DeleteCourseUseCase;
