const IAssessmentRepository = require('../../../domain/repositories/IAssessmentRepository')
const Assessment = require('../../../domain/entities/Assessment')
const AssessmentQuestion = require('../../../domain/entities/AssessmentQuestion')
const AssessmentOption = require('../../../domain/entities/AssessmentOption')

class PrismaAssessmentRepository extends IAssessmentRepository {
  constructor({ prisma }) {
    super()
    this.prisma = prisma
  }

  _mapToEntity(data) {
    if (!data) return null
    return new Assessment({
      id: data.id,
      courseId: data.course_id,
      lessonId: data.lesson_id,
      title: data.title,
      description: data.description,
      type: data.type,
      status: data.status,
      durationMinutes: data.duration_minutes,
      dueDate: data.due_date,
      allowLateSubmissions: data.allow_late_submissions,
      showGrades: data.show_grades,
      showAnswers: data.show_answers,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      questions: data.questions ? data.questions.map(q => new AssessmentQuestion({
        id: q.id,
        assessmentId: q.assessment_id,
        type: q.type,
        text: q.text,
        grade: q.grade,
        order: q.order,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
        options: q.options ? q.options.map(o => new AssessmentOption({
          id: o.id,
          questionId: o.question_id,
          text: o.text,
          isCorrect: o.is_correct
        })) : []
      })) : []
    })
  }

  async create(assessment) {
    const data = await this.prisma.assessment.create({
      data: {
        course_id: assessment.courseId,
        lesson_id: assessment.lessonId,
        title: assessment.title,
        description: assessment.description,
        type: assessment.type,
        status: assessment.status,
        duration_minutes: assessment.durationMinutes,
        due_date: assessment.dueDate,
        allow_late_submissions: assessment.allowLateSubmissions,
        show_grades: assessment.showGrades,
        show_answers: assessment.showAnswers
      }
    })
    return this._mapToEntity(data)
  }

  async findById(id) {
    const data = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            options: true
          },
          orderBy: { order: 'asc' }
        }
      }
    })
    return this._mapToEntity(data)
  }

  async findByCourseId(courseId) {
    const dataList = await this.prisma.assessment.findMany({
      where: { course_id: courseId, lesson_id: null },
      include: { questions: { include: { options: true } } }
    })
    return dataList.map(data => this._mapToEntity(data))
  }

  async findByLessonId(lessonId) {
    const dataList = await this.prisma.assessment.findMany({
      where: { lesson_id: lessonId },
      include: { questions: { include: { options: true } } }
    })
    return dataList.map(data => this._mapToEntity(data))
  }

  async update(id, data) {
    const updatedData = await this.prisma.assessment.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        duration_minutes: data.durationMinutes,
        due_date: data.dueDate,
        allow_late_submissions: data.allowLateSubmissions,
        show_grades: data.showGrades,
        show_answers: data.showAnswers
      }
    })
    return this._mapToEntity(updatedData)
  }

  async delete(id) {
    await this.prisma.assessment.delete({ where: { id } })
  }

  async addQuestion(question) {
    const data = await this.prisma.assessmentQuestion.create({
      data: {
        assessment_id: question.assessmentId,
        type: question.type,
        text: question.text,
        grade: question.grade,
        order: question.order,
        options: {
          create: question.options.map(o => ({
            text: o.text,
            is_correct: o.isCorrect
          }))
        }
      },
      include: { options: true }
    })
    return new AssessmentQuestion({
      id: data.id,
      assessmentId: data.assessment_id,
      type: data.type,
      text: data.text,
      grade: data.grade,
      order: data.order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      options: data.options.map(o => new AssessmentOption({
        id: o.id,
        questionId: o.question_id,
        text: o.text,
        isCorrect: o.is_correct
      }))
    })
  }

  async updateQuestion(id, data) {
    // Basic update for question details. Updating options is complex in Prisma (delete/recreate is usually easier)
    // For simplicity, we just update the text/grade/order here.
    const updated = await this.prisma.assessmentQuestion.update({
      where: { id },
      data: {
        text: data.text,
        grade: data.grade,
        order: data.order
      }
    })
    return updated
  }

  async deleteQuestion(id) {
    await this.prisma.assessmentQuestion.delete({ where: { id } })
  }

  async deleteAllQuestions(assessmentId) {
    await this.prisma.assessmentQuestion.deleteMany({ where: { assessment_id: assessmentId } })
  }
}

module.exports = PrismaAssessmentRepository
