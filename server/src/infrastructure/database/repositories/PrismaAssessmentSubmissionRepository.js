const IAssessmentSubmissionRepository = require('../../../domain/repositories/IAssessmentSubmissionRepository')
const AssessmentSubmission = require('../../../domain/entities/AssessmentSubmission')
const AssessmentAnswer = require('../../../domain/entities/AssessmentAnswer')

class PrismaAssessmentSubmissionRepository extends IAssessmentSubmissionRepository {
  constructor({ prisma }) {
    super()
    this.prisma = prisma
  }

  _mapToEntity(data) {
    if (!data) return null
    return new AssessmentSubmission({
      id: data.id,
      assessmentId: data.assessment_id,
      userId: data.user_id,
      status: data.status,
      totalGrade: data.total_grade,
      startedAt: data.started_at,
      submittedAt: data.submitted_at,
      answers: data.answers ? data.answers.map(a => new AssessmentAnswer({
        id: a.id,
        submissionId: a.submission_id,
        questionId: a.question_id,
        selectedOptionId: a.selected_option_id,
        textAnswer: a.text_answer,
        grade: a.grade,
        instructorFeedback: a.instructor_feedback
      })) : []
    })
  }

  async create(submission) {
    const data = await this.prisma.assessmentSubmission.create({
      data: {
        assessment_id: submission.assessmentId,
        user_id: submission.userId,
        status: submission.status,
        total_grade: submission.totalGrade,
        started_at: submission.startedAt,
        submitted_at: submission.submittedAt
      }
    })
    return this._mapToEntity(data)
  }

  async findById(id) {
    const data = await this.prisma.assessmentSubmission.findUnique({
      where: { id },
      include: { answers: true }
    })
    return this._mapToEntity(data)
  }

  async findByUserAndAssessment(userId, assessmentId) {
    const data = await this.prisma.assessmentSubmission.findFirst({
      where: { user_id: userId, assessment_id: assessmentId },
      include: { answers: true },
      orderBy: { started_at: 'desc' }
    })
    return this._mapToEntity(data)
  }

  async findByAssessmentId(assessmentId) {
    const submissions = await this.prisma.assessmentSubmission.findMany({
      where: { assessment_id: assessmentId },
      include: { 
        answers: true
      },
      orderBy: { submitted_at: 'desc' }
    })

    // Manually fetch user details to avoid modifying Prisma schema right now
    const userIds = [...new Set(submissions.map(sub => sub.user_id))]
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        full_name: true,
        email: true,
        avatar_url: true
      }
    })

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user
      return acc
    }, {})
    
    // We return raw data + mapped entity for ease of use in the Use Case
    return submissions.map(data => ({
      ...this._mapToEntity(data),
      user: userMap[data.user_id] || null
    }))
  }

  async update(id, data) {
    const updated = await this.prisma.assessmentSubmission.update({
      where: { id },
      data: {
        status: data.status,
        total_grade: data.totalGrade,
        submitted_at: data.submittedAt
      }
    })
    return this._mapToEntity(updated)
  }

  async addAnswer(answer) {
    const data = await this.prisma.assessmentAnswer.create({
      data: {
        submission_id: answer.submissionId,
        question_id: answer.questionId,
        selected_option_id: answer.selectedOptionId,
        text_answer: answer.textAnswer,
        grade: answer.grade,
        instructor_feedback: answer.instructorFeedback
      }
    })
    return new AssessmentAnswer({
      id: data.id,
      submissionId: data.submission_id,
      questionId: data.question_id,
      selectedOptionId: data.selected_option_id,
      textAnswer: data.text_answer,
      grade: data.grade,
      instructorFeedback: data.instructor_feedback
    })
  }

  async updateAnswer(id, data) {
    const updated = await this.prisma.assessmentAnswer.update({
      where: { id },
      data: {
        grade: data.grade,
        instructor_feedback: data.instructorFeedback
      }
    })
    return new AssessmentAnswer({
      id: updated.id,
      submissionId: updated.submission_id,
      questionId: updated.question_id,
      selectedOptionId: updated.selected_option_id,
      textAnswer: updated.text_answer,
      grade: updated.grade,
      instructorFeedback: updated.instructor_feedback
    })
  }
}

module.exports = PrismaAssessmentSubmissionRepository
