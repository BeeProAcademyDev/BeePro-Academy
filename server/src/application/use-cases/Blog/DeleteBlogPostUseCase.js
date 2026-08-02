const { NotFoundError, AuthorizationError } = require('../../../domain/errors/AppError')

class DeleteBlogPostUseCase {
  constructor({ blogPostRepository }) {
    this.blogPostRepository = blogPostRepository
  }

  async execute(postId, authorId, userRole) {
    const post = await this.blogPostRepository.findById(postId)
    
    if (!post) {
      throw new NotFoundError('Blog post')
    }

    if (post.authorId !== authorId && userRole !== 'admin') {
      throw new AuthorizationError('Not authorized to delete this blog post')
    }

    await this.blogPostRepository.delete(postId)
  }
}

module.exports = DeleteBlogPostUseCase
