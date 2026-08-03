const ICategoryRepository = require('../../../application/interfaces/ICategoryRepository')

class PrismaCategoryRepository extends ICategoryRepository {
  constructor({ prisma }) {
    super()
    this.prisma = prisma
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' }
    })
  }

  async findById(id) {
    return this.prisma.category.findUnique({ where: { id } })
  }

  async findByName(name) {
    return this.prisma.category.findUnique({ where: { name } })
  }

  async create(data) {
    return this.prisma.category.create({ data })
  }

  async update(id, data) {
    return this.prisma.category.update({ where: { id }, data })
  }

  async delete(id) {
    return this.prisma.category.delete({ where: { id } })
  }
}

module.exports = PrismaCategoryRepository
