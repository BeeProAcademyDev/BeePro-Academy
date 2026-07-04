class DeletePostUseCase {
  constructor({ blogRepository }) {
    this.blogRepository = blogRepository;
  }

  async execute({ id }) {
    if (!id) throw new Error("id is required");
    return await this.blogRepository.delete(id);
  }
}

module.exports = DeletePostUseCase;
