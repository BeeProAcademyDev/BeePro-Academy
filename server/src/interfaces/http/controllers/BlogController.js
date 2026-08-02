class BlogController {
  constructor({
    createBlogPostUseCase,
    updateBlogPostUseCase,
    deleteBlogPostUseCase,
    getAllBlogPostsUseCase,
    getBlogPostByIdUseCase,
    getMyBlogPostsUseCase,
    approveBlogPostUseCase,
    rejectBlogPostUseCase,
    getPendingBlogPostsUseCase
  }) {
    this.createBlogPostUseCase = createBlogPostUseCase
    this.updateBlogPostUseCase = updateBlogPostUseCase
    this.deleteBlogPostUseCase = deleteBlogPostUseCase
    this.getAllBlogPostsUseCase = getAllBlogPostsUseCase
    this.getBlogPostByIdUseCase = getBlogPostByIdUseCase
    this.getMyBlogPostsUseCase = getMyBlogPostsUseCase
    this.approveBlogPostUseCase = approveBlogPostUseCase
    this.rejectBlogPostUseCase = rejectBlogPostUseCase
    this.getPendingBlogPostsUseCase = getPendingBlogPostsUseCase
  }

  create = async (req, res, next) => {
    try {
      const post = await this.createBlogPostUseCase.execute(req.user.id, req.body)
      res.status(201).json({ status: 'success', data: post })
    } catch (error) {
      next(error)
    }
  }

  update = async (req, res, next) => {
    try {
      const post = await this.updateBlogPostUseCase.execute(req.params.postId, req.user.id, req.user.role, req.body)
      res.status(200).json({ status: 'success', data: post })
    } catch (error) {
      next(error)
    }
  }

  delete = async (req, res, next) => {
    try {
      await this.deleteBlogPostUseCase.execute(req.params.postId, req.user.id, req.user.role)
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  }

  getAll = async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10
      const { category, level, search } = req.query
      
      const result = await this.getAllBlogPostsUseCase.execute({ page, limit, category, level, search })
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  getById = async (req, res, next) => {
    try {
      const post = await this.getBlogPostByIdUseCase.execute(req.params.postId)
      res.status(200).json({ status: 'success', data: post })
    } catch (error) {
      next(error)
    }
  }

  getMyPosts = async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10
      const { category, level, search } = req.query
      
      const result = await this.getMyBlogPostsUseCase.execute(req.user.id, { page, limit, category, level, search })
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  approve = async (req, res, next) => {
    try {
      const post = await this.approveBlogPostUseCase.execute(req.params.postId)
      res.status(200).json({ status: 'success', data: post })
    } catch (error) {
      next(error)
    }
  }

  reject = async (req, res, next) => {
    try {
      const post = await this.rejectBlogPostUseCase.execute(req.params.postId)
      res.status(200).json({ status: 'success', data: post })
    } catch (error) {
      next(error)
    }
  }

  getPending = async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10
      
      const result = await this.getPendingBlogPostsUseCase.execute({ page, limit })
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = BlogController
