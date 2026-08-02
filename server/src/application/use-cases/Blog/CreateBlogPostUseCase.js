const { AppError } = require('../../../domain/errors/AppError')

class CreateBlogPostUseCase {
  constructor({ blogPostRepository }) {
    this.blogPostRepository = blogPostRepository
  }

  async execute(authorId, postData) {
    // Force is_published to false (draft) on creation
    // Admin must approve it later
    const payload = {
      ...postData,
      authorId,
      isPublished: false
    }

    return await this.blogPostRepository.create(payload)
  }
}

module.exports = CreateBlogPostUseCase
