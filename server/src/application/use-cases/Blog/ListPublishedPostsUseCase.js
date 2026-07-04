class ListPublishedPostsUseCase {
  constructor({ blogRepository }) {
    this.blogRepository = blogRepository;
  }

  async execute() {
    return await this.blogRepository.listPublished();
  }
}

module.exports = ListPublishedPostsUseCase;
