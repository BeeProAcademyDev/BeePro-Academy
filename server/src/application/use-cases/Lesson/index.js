const { ValidationError, NotFoundError, ForbiddenError } = require('../../../domain/errors/AppError')
const Lesson = require('../../../domain/entities/Lesson')
const Course = require('../../../domain/entities/Course')
const LessonFile = require('../../../domain/entities/LessonFile')

class CreateLessonUseCase {
  constructor({ lessonRepository, sectionRepository, courseRepository, notificationService }) {
    this.lessonRepository = lessonRepository
    this.sectionRepository = sectionRepository
    this.courseRepository = courseRepository
    this.notificationService = notificationService
  }

  async execute({
    sectionId,
    title,
    contentType,
    contentUrl,
    textContent,
    duration,
    isFree,
    requiresPassingQuiz,
    requires_passing_quiz,
    requiresPassingAssignment,
    requires_passing_assignment,
    userId,
    userRole
  }) {
    const section = await this.sectionRepository.findById(sectionId)
    if (!section) throw new NotFoundError('Section')

    const course = await this.courseRepository.findById(section.course_id)
    const courseEntity = new Course({ ...course, instructorId: course.instructor_id })
    if (!courseEntity.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenError('You can only add lessons to your own courses')
    }

    const titleCheck = Lesson.validateTitle(title)
    if (!titleCheck.valid) throw new ValidationError(titleCheck.message)

    if (contentType) {
      const typeCheck = Lesson.validateType(contentType)
      if (!typeCheck.valid) throw new ValidationError(typeCheck.message)
    }

    const maxOrder = await this.lessonRepository.getMaxOrder(sectionId)

    const roundedDuration = (duration !== undefined && duration !== null)
      ? Math.round(Number(duration))
      : 0

    const passQuiz = requiresPassingQuiz !== undefined ? !!requiresPassingQuiz : (requires_passing_quiz !== undefined ? !!requires_passing_quiz : false)
    const passAssign = requiresPassingAssignment !== undefined ? !!requiresPassingAssignment : (requires_passing_assignment !== undefined ? !!requires_passing_assignment : false)

    const createdLesson = await this.lessonRepository.create({
      section_id: sectionId,
      title: title.trim(),
      content_type: contentType || 'video',
      content_url: contentUrl,
      text_content: textContent,
      duration: roundedDuration,
      is_free: !!isFree,
      requires_passing_quiz: passQuiz,
      requires_passing_assignment: passAssign,
      order: maxOrder + 1
    })

    // Automatically recalculate and update the course total duration
    if (this.courseRepository && typeof this.courseRepository.recalculateTotalDuration === 'function') {
      await this.courseRepository.recalculateTotalDuration(course.id)
    }

    if (this.notificationService) {
      await this.notificationService.notifyNewLesson(course.id, createdLesson.title, course.title)
    }

    return createdLesson
  }
}

class UpdateLessonUseCase {
  constructor({ lessonRepository, sectionRepository, courseRepository }) {
    this.lessonRepository = lessonRepository
    this.sectionRepository = sectionRepository
    this.courseRepository = courseRepository
  }

  async execute({
    lessonId,
    title,
    contentType,
    contentUrl,
    textContent,
    duration,
    isFree,
    requiresPassingQuiz,
    requires_passing_quiz,
    requiresPassingAssignment,
    requires_passing_assignment,
    order,
    userId,
    userRole
  }) {
    const lesson = await this.lessonRepository.findById(lessonId)
    if (!lesson) throw new NotFoundError('Lesson')

    const section = await this.sectionRepository.findById(lesson.section_id)
    const course = await this.courseRepository.findById(section.course_id)
    const courseEntity = new Course({ ...course, instructorId: course.instructor_id })
    if (!courseEntity.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenError('You can only edit lessons of your own courses')
    }

    const updateData = {}

    if (title !== undefined) {
      const titleCheck = Lesson.validateTitle(title)
      if (!titleCheck.valid) throw new ValidationError(titleCheck.message)
      updateData.title = title.trim()
    }

    if (contentType !== undefined) {
      const typeCheck = Lesson.validateType(contentType)
      if (!typeCheck.valid) throw new ValidationError(typeCheck.message)
      updateData.content_type = contentType
    }

    if (contentUrl !== undefined) updateData.content_url = contentUrl
    if (textContent !== undefined) updateData.text_content = textContent
    if (duration !== undefined && duration !== null) {
      updateData.duration = Math.round(Number(duration))
    }
    if (isFree !== undefined) updateData.is_free = !!isFree

    const passQuiz = requiresPassingQuiz !== undefined ? requiresPassingQuiz : requires_passing_quiz
    if (passQuiz !== undefined) updateData.requires_passing_quiz = !!passQuiz

    const passAssign = requiresPassingAssignment !== undefined ? requiresPassingAssignment : requires_passing_assignment
    if (passAssign !== undefined) updateData.requires_passing_assignment = !!passAssign

    if (order !== undefined) updateData.order = parseInt(order)

    if (Object.keys(updateData).length === 0) return lesson

    const updatedLesson = await this.lessonRepository.update(lessonId, updateData)

    // Recalculate course total duration if duration changed
    if (duration !== undefined && this.courseRepository && typeof this.courseRepository.recalculateTotalDuration === 'function') {
      await this.courseRepository.recalculateTotalDuration(course.id)
    }

    return updatedLesson
  }
}

class DeleteLessonUseCase {
  constructor({ lessonRepository, sectionRepository, courseRepository }) {
    this.lessonRepository = lessonRepository
    this.sectionRepository = sectionRepository
    this.courseRepository = courseRepository
  }

  async execute({ lessonId, userId, userRole }) {
    const lesson = await this.lessonRepository.findById(lessonId)
    if (!lesson) throw new NotFoundError('Lesson')

    const section = await this.sectionRepository.findById(lesson.section_id)
    const course = await this.courseRepository.findById(section.course_id)
    const courseEntity = new Course({ ...course, instructorId: course.instructor_id })
    if (!courseEntity.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenError('You can only delete lessons of your own courses')
    }

    await this.lessonRepository.delete(lessonId)

    // Recalculate course total duration after lesson deletion
    if (this.courseRepository && typeof this.courseRepository.recalculateTotalDuration === 'function') {
      await this.courseRepository.recalculateTotalDuration(course.id)
    }

    return { success: true }
  }
}

class GetSectionLessonsUseCase {
  constructor({ lessonRepository, sectionRepository, courseRepository }) {
    this.lessonRepository = lessonRepository
    this.sectionRepository = sectionRepository
    this.courseRepository = courseRepository
  }

  async execute({ sectionId, userId, userRole }) {
    const section = await this.sectionRepository.findById(sectionId)
    if (!section) throw new NotFoundError('Section')

    // If it's the instructor or admin, they can see all.
    // If it's a student, they might only see published course lessons, or we might just return them all and the controller decides based on enrollment.
    // For now, let's just return the lessons.
    
    return this.lessonRepository.findBySectionId(sectionId)
  }
}

class AddLessonFileUseCase {
  constructor({ lessonRepository, sectionRepository, courseRepository }) {
    this.lessonRepository = lessonRepository
    this.sectionRepository = sectionRepository
    this.courseRepository = courseRepository
  }

  async execute({ lessonId, fileName, fileUrl, fileType, sizeBytes, userId, userRole }) {
    const lesson = await this.lessonRepository.findById(lessonId)
    if (!lesson) throw new NotFoundError('Lesson')

    const section = await this.sectionRepository.findById(lesson.section_id)
    const course = await this.courseRepository.findById(section.course_id)
    const courseEntity = new Course({ ...course, instructorId: course.instructor_id })
    if (!courseEntity.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenError('You can only add files to lessons of your own courses')
    }

    if (fileType) {
      const typeCheck = LessonFile.validateType(fileType)
      if (!typeCheck.valid) throw new ValidationError(typeCheck.message)
    }

    return this.lessonRepository.addFile(lessonId, {
      file_name: fileName,
      file_url: fileUrl,
      file_type: fileType || 'other',
      size_bytes: sizeBytes || 0
    })
  }
}

class DeleteLessonFileUseCase {
  constructor({ lessonRepository, sectionRepository, courseRepository }) {
    this.lessonRepository = lessonRepository
    this.sectionRepository = sectionRepository
    this.courseRepository = courseRepository
  }

  async execute({ fileId, userId, userRole }) {
    const file = await this.lessonRepository.getFileById(fileId)
    if (!file) throw new NotFoundError('Lesson File')

    const lesson = await this.lessonRepository.findById(file.lesson_id)
    const section = await this.sectionRepository.findById(lesson.section_id)
    const course = await this.courseRepository.findById(section.course_id)
    const courseEntity = new Course({ ...course, instructorId: course.instructor_id })
    if (!courseEntity.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenError('You can only delete files from lessons of your own courses')
    }

    await this.lessonRepository.deleteFile(fileId)
    return { success: true }
  }
}

module.exports = {
  CreateLessonUseCase,
  UpdateLessonUseCase,
  DeleteLessonUseCase,
  GetSectionLessonsUseCase,
  AddLessonFileUseCase,
  DeleteLessonFileUseCase
}
