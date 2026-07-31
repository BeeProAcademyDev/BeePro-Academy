class LessonController {
  constructor({
    createLessonUseCase,
    updateLessonUseCase,
    deleteLessonUseCase,
    getSectionLessonsUseCase,
    addLessonFileUseCase,
    deleteLessonFileUseCase
  }) {
    this.createLessonUseCase = createLessonUseCase
    this.updateLessonUseCase = updateLessonUseCase
    this.deleteLessonUseCase = deleteLessonUseCase
    this.getSectionLessonsUseCase = getSectionLessonsUseCase
    this.addLessonFileUseCase = addLessonFileUseCase
    this.deleteLessonFileUseCase = deleteLessonFileUseCase
  }

  create = async (req, res, next) => {
    try {
      const { sectionId } = req.params
      const userId = req.user.id
      const userRole = req.user.role

      const lesson = await this.createLessonUseCase.execute({
        sectionId, userId, userRole, ...req.body
      })

      res.status(201).json({ success: true, data: lesson })
    } catch (err) {
      next(err)
    }
  }

  update = async (req, res, next) => {
    try {
      const { lessonId } = req.params
      const userId = req.user.id
      const userRole = req.user.role

      const lesson = await this.updateLessonUseCase.execute({
        lessonId, userId, userRole, ...req.body
      })

      res.status(200).json({ success: true, data: lesson })
    } catch (err) {
      next(err)
    }
  }

  delete = async (req, res, next) => {
    try {
      const { lessonId } = req.params
      const userId = req.user.id
      const userRole = req.user.role

      await this.deleteLessonUseCase.execute({ lessonId, userId, userRole })

      res.status(200).json({ success: true, message: 'Lesson deleted successfully' })
    } catch (err) {
      next(err)
    }
  }

  getSectionLessons = async (req, res, next) => {
    try {
      const { sectionId } = req.params
      const userId = req.user?.id
      const userRole = req.user?.role

      const lessons = await this.getSectionLessonsUseCase.execute({ sectionId, userId, userRole })

      res.status(200).json({ success: true, data: lessons })
    } catch (err) {
      next(err)
    }
  }

  addFile = async (req, res, next) => {
    try {
      const { lessonId } = req.params
      const userId = req.user.id
      const userRole = req.user.role

      const file = await this.addLessonFileUseCase.execute({
        lessonId, userId, userRole, ...req.body
      })

      res.status(201).json({ success: true, data: file })
    } catch (err) {
      next(err)
    }
  }

  deleteFile = async (req, res, next) => {
    try {
      const { fileId } = req.params
      const userId = req.user.id
      const userRole = req.user.role

      await this.deleteLessonFileUseCase.execute({ fileId, userId, userRole })

      res.status(200).json({ success: true, message: 'File deleted successfully' })
    } catch (err) {
      next(err)
    }
  }
}

module.exports = LessonController
