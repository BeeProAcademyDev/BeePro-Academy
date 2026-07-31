const Assessment = require('../../../../domain/entities/Assessment')
const AssessmentQuestion = require('../../../../domain/entities/AssessmentQuestion')
const { AppError, NotFoundError, ValidationError ,BadRequestError,AuthorizationError} = require('../../../../domain/errors/AppError')

class CreateAssessmentUseCase {
  constructor({ assessmentRepository, courseRepository, lessonRepository, sectionRepository }) {
    this.assessmentRepository = assessmentRepository
    this.courseRepository = courseRepository
    this.lessonRepository = lessonRepository
    this.sectionRepository = sectionRepository
  }

  async execute(instructorId, data) {
    const course = await this.courseRepository.findById(data.courseId)
    if (!course) {
      throw new NotFoundError('Course not found', 404)
    }

    if (course.instructor_id !== instructorId) {
      throw new AuthorizationError('Not authorized to add assessment to this course', 403)
    }

    if (data.lessonId) {
      const lesson = await this.lessonRepository.findById(data.lessonId)
      if (!lesson) {
        throw new NotFoundError('Lesson not found', 404)
      }
      
      const section = await this.sectionRepository.findById(lesson.section_id)
      if (!section || section.course_id !== data.courseId) {
        throw new AppError('Lesson does not belong to this course', 400)
      }
    }
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      throw new BadRequestError('At least one question is required', 400)
    }

    for (const q of data.questions) {
      if (q.type === 'mcq') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          throw new BadRequestError('MCQ questions require at least 2 options', 400)
        }
        const hasCorrect = q.options.some(opt => opt.isCorrect === true)
        if (!hasCorrect) {
          throw new BadRequestError('MCQ questions require at least one correct option', 400)
        }
      }
    }
    const assessment = new Assessment({
      courseId: data.courseId,
      lessonId: data.lessonId || null,
      title: data.title,
      description: data.description,
      type: data.type, // 'quiz' or 'assignment'
      status: data.status || 'draft',
      durationMinutes: data.durationMinutes || 0,
      dueDate: data.dueDate || null,
      allowLateSubmissions: data.allowLateSubmissions || false,
      showGrades: data.showGrades || false,
      showAnswers: data.showAnswers || false
    })

    const createdAssessment = await this.assessmentRepository.create(assessment)
    const createdQuestions = await Promise.all(
      data.questions.map((q, index) => {
        const question = new AssessmentQuestion({
          assessmentId: createdAssessment.id,
          type: q.type,
          text: q.text,
          grade: q.grade || 1,
          order: q.order ?? index,
          options: q.type === 'mcq' ? q.options : []
        })
        return this.assessmentRepository.addQuestion(question)
      })
    )  

    return { ...createdAssessment, questions: createdQuestions }
  }
}

module.exports = CreateAssessmentUseCase
