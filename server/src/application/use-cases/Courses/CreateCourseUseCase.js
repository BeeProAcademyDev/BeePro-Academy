class CreateCourseUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository;
  }

  async execute({ data }) {
    if (!data) throw new Error("data is required");
    return await this.courseRepository.create(data);
  }
}

module.exports = CreateCourseUseCase;
