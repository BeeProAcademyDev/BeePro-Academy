class GetCourseUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository;
  }

  async execute({ id }) {
    if (!id) throw new Error("id is required");
    return await this.courseRepository.getById(id);
  }
}

module.exports = GetCourseUseCase;
