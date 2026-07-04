class BlogController {
  constructor({
    listPublishedUseCase,
    listAdminUseCase,
    createUseCase,
    updateUseCase,
    deleteUseCase,
  }) {
    this.listPublishedUseCase = listPublishedUseCase;
    this.listAdminUseCase = listAdminUseCase;
    this.createUseCase = createUseCase;
    this.updateUseCase = updateUseCase;
    this.deleteUseCase = deleteUseCase;
  }

  listPublished = async (req, res, next) => {
    try {
      const result = await this.listPublishedUseCase.execute();
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  listAdmin = async (req, res, next) => {
    try {
      const result = await this.listAdminUseCase.execute();
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

module.exports = BlogController;
