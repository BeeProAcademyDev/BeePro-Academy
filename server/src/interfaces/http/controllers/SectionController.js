class SectionController {
  constructor({
    createSectionUseCase,
    updateSectionUseCase,
    deleteSectionUseCase,
    getAllCourseSectionUseCase
  }) {
    this.createSectionUseCase = createSectionUseCase
    this.updateSectionUseCase = updateSectionUseCase
    this.deleteSectionUseCase = deleteSectionUseCase
    this.getAllCourseSectionUseCase = getAllCourseSectionUseCase
  }

  create = async (req, res, next) => {
    try {
      const { courseId } = req.params
      const { title } = req.body
      const userId = req.user.id
      const userRole = req.user.role

      const section = await this.createSectionUseCase.execute({
        courseId, title, userId, userRole
      })

      res.status(201).json({ success: true, data: section })
    } catch (err) {
      next(err)
    }
  }

  update = async (req, res, next) => {
    try {
      const { sectionId } = req.params
      const { title, order } = req.body
      const userId = req.user.id
      const userRole = req.user.role

      const section = await this.updateSectionUseCase.execute({
        sectionId, title, order, userId, userRole
      })

      res.status(200).json({ success: true, data: section })
    } catch (err) {
      next(err)
    }
  }

  delete = async (req, res, next) => {
    try {
      const { sectionId } = req.params
      const userId = req.user.id
      const userRole = req.user.role

      await this.deleteSectionUseCase.execute({ sectionId, userId, userRole })

      res.status(200).json({ success: true, message: 'Section deleted successfully' })
    } catch (err) {
      next(err)
    }
  }

  getAll=async (req,res,next) =>{
    try{
      const { courseId } = req.params
      const sections = await this.getAllCourseSectionUseCase.execute({ courseId })

      res.status(200).json({success:true,data:sections})
    }catch(err){
      next(err)
    }
  }
}

module.exports = SectionController
