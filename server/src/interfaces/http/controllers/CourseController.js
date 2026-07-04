class CourseController {
  constructor({
    listUseCase,
    getUseCase,
    createUseCase,
    updateUseCase,
    deleteUseCase,
  }) {
    this.listUseCase = listUseCase;
    this.getUseCase = getUseCase;
    this.createUseCase = createUseCase;
    this.updateUseCase = updateUseCase;
    this.deleteUseCase = deleteUseCase;
  }

  list = async (req, res, next) => {
    try {
      const { category, level, search, limit, offset } = req.query;
      const result = await this.listUseCase.execute({
        category,
        level,
        search,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  get = async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await this.getUseCase.execute({ id });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  create = async (req, res, next) => {
    try {
      const data = req.body;
      const result = await this.createUseCase.execute({ data });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const result = await this.updateUseCase.execute({ id, data });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await this.deleteUseCase.execute({ id });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = CourseController;
