class GetAllCoursesUseCase {
  constructor({ courseRepository }) {
    this.courseRepository = courseRepository
  }

  /**
   * Public listing — only returns `published` courses by default.
   * Passing status explicitly (e.g. from an admin panel) will override.
   */
  async execute({ page = 1, limit = 20, categoryId, search, status }) {
    return this.courseRepository.findAll({
      page,
      limit,
      status: status || 'published', // Default to published for public catalog
      categoryId,
      search
    })
  }
}

module.exports = GetAllCoursesUseCase
