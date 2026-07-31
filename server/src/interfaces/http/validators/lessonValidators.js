const { z } = require('zod')
const Lesson = require('../../../domain/entities/Lesson')
const LessonFile = require('../../../domain/entities/LessonFile')

const createLessonSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    contentType: z.enum(Lesson.VALID_TYPES).optional(),
    contentUrl: z.string().url().optional().nullable(),
    textContent: z.string().optional().nullable(),
    duration: z.number().int().min(0).optional(),
    isFree: z.boolean().optional(),
    requiresPassingQuiz: z.boolean().optional(),
    requiresPassingAssignment: z.boolean().optional()
  })
})

const updateLessonSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').optional(),
    contentType: z.enum(Lesson.VALID_TYPES).optional(),
    contentUrl: z.string().url().optional().nullable(),
    textContent: z.string().optional().nullable(),
    duration: z.number().int().min(0).optional(),
    isFree: z.boolean().optional(),
    requiresPassingQuiz: z.boolean().optional(),
    requiresPassingAssignment: z.boolean().optional(),
    order: z.number().int().min(0).optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided'
  })
})

const addLessonFileSchema = z.object({
  body: z.object({
    fileName: z.string().min(1, 'File name is required'),
    fileUrl: z.string().url('Invalid file URL'),
    fileType: z.enum(LessonFile.VALID_TYPES).optional(),
    sizeBytes: z.number().int().min(0).optional()
  })
})

module.exports = {
  createLessonSchema,
  updateLessonSchema,
  addLessonFileSchema
}
