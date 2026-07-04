class CreatePostUseCase {
  constructor({ blogRepository }) {
    this.blogRepository = blogRepository;
  }

  async execute({ data }) {
    if (!data) throw new Error("data is required");
    return await this.blogRepository.create(data);
  }
}

module.exports = CreatePostUseCase;
