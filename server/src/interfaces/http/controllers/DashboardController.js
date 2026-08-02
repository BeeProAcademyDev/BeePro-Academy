const { toStudentDashboardDto } = require('../../../application/dtos/DashboardDtos/StudentDashboardDto')
const { toTeacherDashboardDto } = require('../../../application/dtos/DashboardDtos/TeacherDashboardDto')
const { toAdminDashboardDto } = require('../../../application/dtos/DashboardDtos/AdminDashboardDto')

class DashboardController {
  constructor({
    studentDashboardStats,
    teacherDashboardStats,
    adminDashboardStats
  }) {
    this.studentDashboardStats = studentDashboardStats
    this.teacherDashboardStats = teacherDashboardStats
    this.adminDashboardStats = adminDashboardStats
  }

  getStudentDashboardStats = async (req, res, next) => {
    try {
      const userId = req.user.id
      const dashboard = await this.studentDashboardStats.execute({ userId })
      res.status(200).json({ success: true, data: toStudentDashboardDto(dashboard) })
    } catch (err) {
      next(err)
    }
  }

  getTeacherDashboardStats = async (req, res, next) => {
    try {
      const userId = req.user.id
      const dashboard = await this.teacherDashboardStats.execute({ userId })
      res.status(200).json({ success: true, data: toTeacherDashboardDto(dashboard) })
    } catch (err) {
      next(err)
    }
  }

  getAdminDashboardStats = async (req, res, next) => {
    try {
      const dashboard = await this.adminDashboardStats.execute()
      res.status(200).json({ success: true, data: toAdminDashboardDto(dashboard) })
    } catch (err) {
      next(err)
    }
  }
}

module.exports = DashboardController