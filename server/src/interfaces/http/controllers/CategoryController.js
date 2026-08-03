class CategoryController {
  constructor({
    createCategoryUseCase,
    getAllCategoriesUseCase,
    updateCategoryUseCase,
    deleteCategoryUseCase
  }) {
    this.createCategoryUseCase = createCategoryUseCase
    this.getAllCategoriesUseCase = getAllCategoriesUseCase
    this.updateCategoryUseCase = updateCategoryUseCase
    this.deleteCategoryUseCase = deleteCategoryUseCase
  }

  getAll = async (req, res, next) => {
    try {
      const categories = await this.getAllCategoriesUseCase.execute()
      res.status(200).json({ success: true, data: categories })
    } catch (err) {
      next(err)
    }
  }

  create = async (req, res, next) => {
    try {
      const category = await this.createCategoryUseCase.execute(req.body)
      res.status(201).json({ success: true, data: category })
    } catch (err) {
      next(err)
    }
  }

  update = async (req, res, next) => {
    try {
      const categoryId = req.params.id
      const category = await this.updateCategoryUseCase.execute({ categoryId, ...req.body })
      res.status(200).json({ success: true, data: category })
    } catch (err) {
      next(err)
    }
  }

  delete = async (req, res, next) => {
    try {
      await this.deleteCategoryUseCase.execute({ categoryId: req.params.id })
      res.status(200).json({ success: true, message: 'Category deleted successfully' })
    } catch (err) {
      next(err)
    }
  }
}

module.exports = CategoryController
