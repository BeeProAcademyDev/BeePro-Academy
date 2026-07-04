class ListCoursesUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository;
  }

  async execute({ category, level, search, limit, offset } = {}) {
    return await this.courseRepository.list({
      category,
      level,
      search,
      limit,
      offset,
    });
  }
}

module.exports = ListCoursesUseCase;
