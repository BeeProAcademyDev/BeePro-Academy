class UpdateCourseUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository;
  }

  async execute({ id, data }) {
    if (!id) throw new Error("id is required");
    if (!data) throw new Error("data is required");
    return await this.courseRepository.update(id, data);
  }
}

module.exports = UpdateCourseUseCase;
