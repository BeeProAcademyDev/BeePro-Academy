const IBlogPostRepository = require('../../../application/interfaces/IBlogPostRepository')
const BlogPost = require('../../../domain/entities/BlogPost')

class PrismaBlogPostRepository extends IBlogPostRepository {
  constructor(prisma) {
    super()
    this.prisma = prisma
  }

  _toEntity(record) {
    if (!record) return null
    return new BlogPost({
      id: record.id,
      title: record.title,
      content: record.content,
      image_url: record.image_url,
      author_id: record.author_id,
      category: record.category,
      level: record.level,
      is_published: record.is_published,
      is_updated: record.is_updated,
      created_at: record.created_at,
      updated_at: record.updated_at,
      author: record.author
    })
  }

  async create(postData) {
    const record = await this.prisma.blogPost.create({
      data: {
        title: postData.title,
        content: postData.content,
        image_url: postData.imageUrl,
        author_id: postData.authorId,
        category: postData.category,
        level: postData.level,
        is_published: postData.isPublished,
        is_updated: false
      },
      include: {
        author: {
          select: { id: true, full_name: true, avatar_url: true, bio: true }
        }
      }
    })
    return this._toEntity(record)
  }

  async findById(id) {
    const record = await this.prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, full_name: true, avatar_url: true, bio: true }
        }
      }
    })
    return this._toEntity(record)
  }

  _buildWhereClause({ category, level, search }) {
    const where = {}
    if (category) where.category = category
    if (level) where.level = level
    if (search) {
      where.title = { contains: search, mode: 'insensitive' }
    }
    return where
  }

  async findAll({ skip = 0, take = 10, category, level, search }) {
    const where = {
      ...this._buildWhereClause({ category, level, search }),
      is_published: true // Only return published posts for public API
    }

    const [records, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        include: {
          author: { select: { id: true, full_name: true, avatar_url: true, bio: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take
      }),
      this.prisma.blogPost.count({ where })
    ])

    return { posts: records.map(this._toEntity), total }
  }

  async findByAuthor(authorId, { skip = 0, take = 10, category, level, search }) {
    const where = {
      ...this._buildWhereClause({ category, level, search }),
      author_id: authorId
    }

    const [records, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        include: {
          author: { select: { id: true, full_name: true, avatar_url: true, bio: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take
      }),
      this.prisma.blogPost.count({ where })
    ])

    return { posts: records.map(this._toEntity), total }
  }

  async findPendingApproval({ skip = 0, take = 10 }) {
    const where = { is_published: false }

    const [records, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        include: {
          author: { select: { id: true, full_name: true, avatar_url: true, bio: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take
      }),
      this.prisma.blogPost.count({ where })
    ])

    return { posts: records.map(this._toEntity), total }
  }

  async update(id, postData) {
    const record = await this.prisma.blogPost.update({
      where: { id },
      data: {
        title: postData.title,
        content: postData.content,
        image_url: postData.imageUrl,
        category: postData.category,
        level: postData.level,
        is_published: postData.isPublished,
        is_updated: postData.isUpdated
      },
      include: {
        author: { select: { id: true, full_name: true, avatar_url: true, bio: true } }
      }
    })
    return this._toEntity(record)
  }

  async delete(id) {
    await this.prisma.blogPost.delete({ where: { id } })
  }

  async countPending() {
    return this.prisma.blogPost.count({
      where: { is_published: false }
    })
  }

  async countAll() {
    return this.prisma.blogPost.count()
  }
}

module.exports = PrismaBlogPostRepository
