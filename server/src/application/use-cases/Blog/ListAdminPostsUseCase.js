class ListAdminPostsUseCase {
  constructor({ blogRepository }) {
    this.blogRepository = blogRepository;
  }

  async execute() {
    return await this.blogRepository.listAll();
  }
}

module.exports = ListAdminPostsUseCase;
