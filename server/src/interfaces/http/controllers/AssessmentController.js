class AssessmentController {
  constructor({
    createAssessmentUseCase,
    updateAssessmentUseCase,
    addQuestionUseCase,
    updateQuestionUseCase,
    deleteQuestionUseCase,
    startAssessmentUseCase,
    submitAssessmentUseCase,
    getAssessmentDetailsUseCase,
    getSubmissionResultUseCase,
    reviewSubmissionUseCase,
    deleteAssessmentUseCase,
    getAssessmentSubmissionsUseCase,
    getSubmissionForReviewUseCase
  }) {
    this.createAssessmentUseCase = createAssessmentUseCase
    this.updateAssessmentUseCase = updateAssessmentUseCase
    this.addQuestionUseCase = addQuestionUseCase
    this.updateQuestionUseCase = updateQuestionUseCase
    this.deleteQuestionUseCase = deleteQuestionUseCase
    this.startAssessmentUseCase = startAssessmentUseCase
    this.submitAssessmentUseCase = submitAssessmentUseCase
    this.getAssessmentDetailsUseCase = getAssessmentDetailsUseCase
    this.getSubmissionResultUseCase = getSubmissionResultUseCase
    this.reviewSubmissionUseCase = reviewSubmissionUseCase
    this.deleteAssessmentUseCase = deleteAssessmentUseCase
    this.getAssessmentSubmissionsUseCase = getAssessmentSubmissionsUseCase
    this.getSubmissionForReviewUseCase = getSubmissionForReviewUseCase
  }

  // --- Instructor Routes ---

  create = async (req, res, next) => {
    try {
      const instructorId = req.user.id
      const data = { ...req.body, courseId: req.params.courseId }
      const result = await this.createAssessmentUseCase.execute(instructorId, data)
      res.status(201).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  update = async (req, res, next) => {
    try {
      const instructorId = req.user.id
      const result = await this.updateAssessmentUseCase.execute(instructorId, req.params.assessmentId, req.body)
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  deleteAssessment = async (req, res, next) => {
    try {
      const instructorId = req.user.id
      await this.deleteAssessmentUseCase.execute(instructorId, req.params.assessmentId)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  } 

  addQuestion = async (req, res, next) => {
    try {
      const instructorId = req.user.id
      const result = await this.addQuestionUseCase.execute(instructorId, req.params.assessmentId, req.body)
      res.status(201).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  updateQuestion = async (req, res, next) => {
    try {
      const instructorId = req.user.id
      const result = await this.updateQuestionUseCase.execute(instructorId, req.params.assessmentId, req.params.questionId, req.body)
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  deleteQuestion = async (req, res, next) => {
    try {
      const instructorId = req.user.id
      await this.deleteQuestionUseCase.execute(instructorId, req.params.assessmentId, req.params.questionId)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  reviewSubmission = async (req, res, next) => {
    try {
      const instructorId = req.user.id
      const result = await this.reviewSubmissionUseCase.execute(instructorId, req.params.submissionId, req.body)
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  getSubmissions = async (req, res, next) => {
    try {
      const instructorId = req.user.id
      const result = await this.getAssessmentSubmissionsUseCase.execute(instructorId, req.params.assessmentId)
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  getSubmissionForReview = async (req, res, next) => {
    try {
      const instructorId = req.user.id
      const result = await this.getSubmissionForReviewUseCase.execute(instructorId, req.params.submissionId)
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  // --- Student Routes ---

  getDetails = async (req, res, next) => {
    try {
      const userId = req.user.id
      const result = await this.getAssessmentDetailsUseCase.execute(userId, req.params.assessmentId)
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  startSession = async (req, res, next) => {
    try {
      const userId = req.user.id
      const result = await this.startAssessmentUseCase.execute(userId, req.params.assessmentId)
      res.status(201).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  submitSession = async (req, res, next) => {
    try {
      const userId = req.user.id
      const result = await this.submitAssessmentUseCase.execute(userId, req.params.assessmentId, req.body.answers)
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }

  getSubmissionResult = async (req, res, next) => {
    try {
      const userId = req.user.id
      const result = await this.getSubmissionResultUseCase.execute(userId, req.params.submissionId)
      res.status(200).json({ status: 'success', data: result })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = AssessmentController
