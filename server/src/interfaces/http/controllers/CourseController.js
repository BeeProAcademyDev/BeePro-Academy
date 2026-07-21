const { toCourseDTO } = require('../../../application/dtos/courseDTOs')

class CourseController {
  constructor({
    createCourseUseCase,
    updateCourseUseCase,
    deleteCourseUseCase,
    getCourseByIdUseCase,
    getAllCoursesUseCase,
    getInstructorCoursesUseCase
  }) {
    this.createCourseUseCase = createCourseUseCase
    this.updateCourseUseCase = updateCourseUseCase
    this.deleteCourseUseCase = deleteCourseUseCase
    this.getCourseByIdUseCase = getCourseByIdUseCase
    this.getAllCoursesUseCase = getAllCoursesUseCase
    this.getInstructorCoursesUseCase = getInstructorCoursesUseCase
  }

  createCourse = async (req, res, next) => {
    try {
      const { title, description, price, categoryId } = req.body
      const instructorId = req.user.id
      const userRole = req.user.role

      const course = await this.createCourseUseCase.execute({
        title, description, price, categoryId, instructorId, userRole
      })

      res.status(201).json({ success: true, data: toCourseDTO(course) })
    } catch (err) {
      next(err)
    }
  }

  updateCourse = async (req, res, next) => {
    try {
      const courseId = req.params.id
      const userId = req.user.id
      const userRole = req.user.role
      const updateData = req.body

      const course = await this.updateCourseUseCase.execute({
        courseId, userId, userRole, updateData
      })

      res.status(200).json({ success: true, data: toCourseDTO(course) })
    } catch (err) {
      next(err)
    }
  }

  deleteCourse = async (req, res, next) => {
    try {
      const courseId = req.params.id
      const userId = req.user.id
      const userRole = req.user.role

      await this.deleteCourseUseCase.execute({ courseId, userId, userRole })

      res.status(200).json({ success: true, message: 'Course deleted successfully' })
    } catch (err) {
      next(err)
    }
  }

  getCourseById = async (req, res, next) => {
    try {
      const courseId = req.params.id
      // Optional auth info (public vs student vs instructor)
      const userId = req.user?.id
      const userRole = req.user?.role

      const course = await this.getCourseByIdUseCase.execute({ courseId, userId, userRole })

      res.status(200).json({ success: true, data: toCourseDTO(course) })
    } catch (err) {
      next(err)
    }
  }

  getAllCourses = async (req, res, next) => {
    try {
      const { page, limit, categoryId, search, status } = req.query

      const result = await this.getAllCoursesUseCase.execute({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        categoryId,
        search,
        status  // allows ?status=draft for testing / admin panel
      })

      result.courses = result.courses.map(toCourseDTO)

      res.status(200).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  }

  getInstructorCourses = async (req, res, next) => {
    try {
      const instructorId = req.user.id
      const userRole = req.user.role
      const { page, limit, status, search } = req.query

      const result = await this.getInstructorCoursesUseCase.execute({
        instructorId,
        userRole,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status,
        search
      })

      result.courses = result.courses.map(toCourseDTO)

      res.status(200).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  }
}

module.exports = CourseController
