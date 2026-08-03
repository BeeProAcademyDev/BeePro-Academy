const { NotFoundError, AuthorizationError } = require('../../../domain/errors/AppError')

class UpdateBlogPostUseCase {
  constructor({ blogPostRepository }) {
    this.blogPostRepository = blogPostRepository
  }

  async execute(postId, authorId, userRole, postData) {
    const post = await this.blogPostRepository.findById(postId)
    
    if (!post) {
      throw new NotFoundError('Blog post')
    }

    // Only author or admin can update
    if (post.authorId !== authorId && userRole !== 'admin') {
      throw new AuthorizationError('Not authorized to update this blog post')
    }

    // Updating a post marks it as updated and sets it back to draft for admin approval
    const payload = {
      ...postData,
      isUpdated: true,
      isPublished: false // Reset to draft
    }

    return await this.blogPostRepository.update(postId, payload)
  }
}

module.exports = UpdateBlogPostUseCase
