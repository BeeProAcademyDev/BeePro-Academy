class GetMyBlogPostsUseCase {
  constructor({ blogPostRepository }) {
    this.blogPostRepository = blogPostRepository
  }

  async execute(authorId, query = {}) {
    const { page = 1, limit = 10, category, level, search } = query
    const skip = (page - 1) * limit

    return await this.blogPostRepository.findByAuthor(authorId, { skip, take: limit, category, level, search })
  }
}

module.exports = GetMyBlogPostsUseCase
