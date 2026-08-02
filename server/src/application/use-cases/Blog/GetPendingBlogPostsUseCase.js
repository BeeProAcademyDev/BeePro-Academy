class GetPendingBlogPostsUseCase {
  constructor({ blogPostRepository }) {
    this.blogPostRepository = blogPostRepository
  }

  async execute(query = {}) {
    const { page = 1, limit = 10 } = query
    const skip = (page - 1) * limit

    return await this.blogPostRepository.findPendingApproval({ skip, take: limit })
  }
}

module.exports = GetPendingBlogPostsUseCase
