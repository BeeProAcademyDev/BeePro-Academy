const { ValidationError, NotFoundError, ForbiddenError } = require('../../../domain/errors/AppError')
const Lesson = require('../../../domain/entities/Lesson')
const Course = require('../../../domain/entities/Course')
const LessonFile = require('../../../domain/entities/LessonFile')

class CreateLessonUseCase {
  constructor({ lessonRepository, sectionRepository, courseRepository }) {
    this.lessonRepository = lessonRepository
    this.sectionRepository = sectionRepository
    this.courseRepository = courseRepository
  }

  async execute({ sectionId, title, contentType, contentUrl, textContent, duration,isFree, userId, userRole }) {
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

    return this.lessonRepository.create({
      section_id: sectionId,
      title: title.trim(),
      content_type: contentType || 'video',
      content_url: contentUrl,
      text_content: textContent,
      duration: duration || 0,
      is_free: !!isFree,
      order: maxOrder + 1
    })
  }
}

class UpdateLessonUseCase {
  constructor({ lessonRepository, sectionRepository, courseRepository }) {
    this.lessonRepository = lessonRepository
    this.sectionRepository = sectionRepository
    this.courseRepository = courseRepository
  }

  async execute({ lessonId, title, contentType, contentUrl, textContent, duration, isFree, order, userId, userRole }) {
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
    if (duration !== undefined) updateData.duration = duration
    if (isFree !== undefined) updateData.is_free = !!isFree
    if (order !== undefined) updateData.order = parseInt(order)

    if (Object.keys(updateData).length === 0) return lesson

    return this.lessonRepository.update(lessonId, updateData)
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
