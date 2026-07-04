class UpdatePostUseCase {
  constructor({ blogRepository }) {
    this.blogRepository = blogRepository;
  }

  async execute({ id, data }) {
    if (!id) throw new Error("id is required");
    if (!data) throw new Error("data is required");
    return await this.blogRepository.update(id, data);
  }
}

module.exports = UpdatePostUseCase;
