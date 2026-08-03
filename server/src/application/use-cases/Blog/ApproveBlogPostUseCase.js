const { NotFoundError } = require('../../../domain/errors/AppError')

class ApproveBlogPostUseCase {
  constructor({ blogPostRepository }) {
    this.blogPostRepository = blogPostRepository
  }

  async execute(postId) {
    const post = await this.blogPostRepository.findById(postId)
    
    if (!post) {
      throw new NotFoundError('Blog post')
    }

    return await this.blogPostRepository.update(postId, {
      ...post,
      isPublished: true
    })
  }
}

module.exports = ApproveBlogPostUseCase
