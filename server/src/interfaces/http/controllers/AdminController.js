/**
 * AdminController — Handles HTTP requests for admin operations.
 */
class AdminController {
  constructor({
    getAllUsersUseCase,
    getPendingInstructorsUseCase,
    approveInstructorUseCase,
    rejectInstructorUseCase,
    suspendUserUseCase,
    activateUserUseCase,
    deleteUserUseCase,
  }) {
    this.getAllUsersUseCase = getAllUsersUseCase
    this.getPendingInstructorsUseCase = getPendingInstructorsUseCase
    this.approveInstructorUseCase = approveInstructorUseCase
    this.rejectInstructorUseCase = rejectInstructorUseCase
    this.suspendUserUseCase = suspendUserUseCase
    this.activateUserUseCase = activateUserUseCase
    this.deleteUserUseCase = deleteUserUseCase
  }

  getAllUsers = async (req, res, next) => {
    try {
      const { page, limit, role, status, search } = req.query
      const result = await this.getAllUsersUseCase.execute({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        role,
        status,
        search,
      })
      res.status(200).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  }

  getPendingInstructors = async (req, res, next) => {
    try {
      const users = await this.getPendingInstructorsUseCase.execute()
      res.status(200).json({ success: true, data: users })
    } catch (err) {
      next(err)
    }
  }

  approveInstructor = async (req, res, next) => {
    try {
      const result = await this.approveInstructorUseCase.execute({ userId: req.params.id })
      res.status(200).json({ success: true, data: result, message: 'Instructor approved successfully' })
    } catch (err) {
      next(err)
    }
  }

  rejectInstructor = async (req, res, next) => {
    try {
      const result = await this.rejectInstructorUseCase.execute({ userId: req.params.id })
      res.status(200).json({ success: true, data: result, message: 'Instructor rejected' })
    } catch (err) {
      next(err)
    }
  }

  suspendUser = async (req, res, next) => {
    try {
      const result = await this.suspendUserUseCase.execute({
        userId: req.params.id,
        adminId: req.user.id,
      })
      res.status(200).json({ success: true, data: result, message: 'User suspended' })
    } catch (err) {
      next(err)
    }
  }

  activateUser = async (req, res, next) => {
    try {
      const result = await this.activateUserUseCase.execute({ userId: req.params.id })
      res.status(200).json({ success: true, data: result, message: 'User activated' })
    } catch (err) {
      next(err)
    }
  }

  deleteUser = async (req, res, next) => {
    try {
      const result = await this.deleteUserUseCase.execute({
        userId: req.params.id,
        adminId: req.user.id,
      })
      res.status(200).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  }
}

module.exports = AdminController
