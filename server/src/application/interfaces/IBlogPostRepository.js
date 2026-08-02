class IBlogPostRepository {
  async create(postData) { throw new Error('Method not implemented') }
  async findById(id) { throw new Error('Method not implemented') }
  async findAll({ skip, take, category, level, search }) { throw new Error('Method not implemented') }
  async findByAuthor(authorId, { skip, take, category, level, search }) { throw new Error('Method not implemented') }
  async findPendingApproval({ skip, take }) { throw new Error('Method not implemented') }
  async update(id, postData) { throw new Error('Method not implemented') }
  async delete(id) { throw new Error('Method not implemented') }
}

module.exports = IBlogPostRepository
