class MeetingController {
  constructor({
    createMeetingUseCase,
    updateMeetingUseCase,
    deleteMeetingUseCase,
    getLessonMeetingUseCase,
    getUpcomingSessionsUseCase,
    joinMeetingUseCase
  }) {
    this.createMeetingUseCase = createMeetingUseCase
    this.updateMeetingUseCase = updateMeetingUseCase
    this.deleteMeetingUseCase = deleteMeetingUseCase
    this.getLessonMeetingUseCase = getLessonMeetingUseCase
    this.getUpcomingSessionsUseCase = getUpcomingSessionsUseCase
    this.joinMeetingUseCase = joinMeetingUseCase
  }

  createMeeting = async (req, res, next) => {
    try {
      const { lessonId } = req.params
      const { title, scheduledAt, durationMinutes } = req.body
      const meeting = await this.createMeetingUseCase.execute({
        lessonId,
        title,
        scheduledAt,
        durationMinutes,
        userId: req.user.id,
        userRole: req.user.role
      })
      res.status(201).json({ status: 'success', data: meeting })
    } catch (error) {
      next(error)
    }
  }

  updateMeeting = async (req, res, next) => {
    try {
      const { meetingId } = req.params
      const { title, scheduledAt, durationMinutes, status } = req.body
      const meeting = await this.updateMeetingUseCase.execute({
        meetingId,
        title,
        scheduledAt,
        durationMinutes,
        status,
        userId: req.user.id,
        userRole: req.user.role
      })
      res.status(200).json({ status: 'success', data: meeting })
    } catch (error) {
      next(error)
    }
  }

  deleteMeeting = async (req, res, next) => {
    try {
      const { meetingId } = req.params
      const result = await this.deleteMeetingUseCase.execute({
        meetingId,
        userId: req.user.id,
        userRole: req.user.role
      })
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  getLessonMeeting = async (req, res, next) => {
    try {
      const { lessonId } = req.params
      const meeting = await this.getLessonMeetingUseCase.execute({
        lessonId,
        userId: req.user?.id,
        userRole: req.user?.role
      })
      res.status(200).json({ status: 'success', data: meeting })
    } catch (error) {
      next(error)
    }
  }

  getUpcomingSessions = async (req, res, next) => {
    try {
      const sessions = await this.getUpcomingSessionsUseCase.execute({
        instructorId: req.user.id
      })
      res.status(200).json({ status: 'success', data: sessions })
    } catch (error) {
      next(error)
    }
  }

  joinMeeting = async (req, res, next) => {
    try {
      const { meetingId } = req.params
      const result = await this.joinMeetingUseCase.execute({
        meetingId,
        userId: req.user.id,
        userRole: req.user.role
      })
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = MeetingController
