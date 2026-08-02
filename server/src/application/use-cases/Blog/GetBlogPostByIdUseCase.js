const { NotFoundError } = require('../../../domain/errors/AppError')

class GetBlogPostByIdUseCase {
  constructor({ blogPostRepository }) {
    this.blogPostRepository = blogPostRepository
  }

  async execute(postId) {
    const post = await this.blogPostRepository.findById(postId)
    
    if (!post) {
      throw new NotFoundError('Blog post')
    }

    // Only allow fetching if published (unless you are admin/author, handled in another route usually, but for public route we enforce this)
    if (!post.isPublished) {
      throw new NotFoundError('Blog post')
    }

    return post
  }
}

module.exports = GetBlogPostByIdUseCase
