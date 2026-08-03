const { z } = require('zod')
const validate = require('../middlewares/validate')

const createAssessmentSchema = z.object({
  body: z.object({
    lessonId: z.string().uuid().optional(), // Course ID is from params
    title: z.string().min(3),
    description: z.string().optional(),
    type: z.enum(['quiz', 'assignment']),
    status: z.enum(['draft', 'published']).optional(),
    durationMinutes: z.number().int().min(0).optional(),
    dueDate: z.string().datetime().optional(), // ISO string
    allowLateSubmissions: z.boolean().optional(),
    showGrades: z.boolean().optional(),
    showAnswers: z.boolean().optional(),
    questions: z.array(
  z.object({
    type: z.enum(['mcq', 'text']),
    text: z.string().min(3),
    grade: z.number().int().min(0).optional(), // min(0) now, since 0 = valid ungraded
    order: z.number().int().min(0).optional(),
    options: z.array(z.object({
      text: z.string(),
      isCorrect: z.boolean().default(false)
    })).max(10).optional()
  }).refine(
    (q) => q.type !== 'mcq' || (q.options && q.options.length >= 2),
    { message: 'MCQ questions require at least 2 options', path: ['options'] }
  ).refine(
    (q) => q.type !== 'mcq' || q.options.some(o => o.isCorrect === true),
    { message: 'MCQ questions require at least one correct option', path: ['options'] }
  )
).min(1)
  })
})

const updateAssessmentSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    status: z.enum(['draft', 'published']).optional(),
    durationMinutes: z.number().int().min(0).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    allowLateSubmissions: z.boolean().optional(),
    showGrades: z.boolean().optional(),
    showAnswers: z.boolean().optional(),
     questions: z.array(
   z.object({
     type: z.enum(['mcq', 'text']),
    text: z.string().min(3),
    grade: z.number().int().min(0).optional(), // min(0) now, since 0 = valid ungraded
    order: z.number().int().min(0).optional(),
    options: z.array(z.object({
      text: z.string(),
      isCorrect: z.boolean().default(false)
    })).max(10).optional()
  }).refine(
    (q) => q.type !== 'mcq' || (q.options && q.options.length >= 2),
    { message: 'MCQ questions require at least 2 options', path: ['options'] }
  ).refine(
    (q) => q.type !== 'mcq' || q.options.some(o => o.isCorrect === true),
    { message: 'MCQ questions require at least one correct option', path: ['options'] }
  )
).min(1)
  })
})

const addQuestionSchema = z.object({
  body: z.object({
    type: z.enum(['mcq', 'text']),
    text: z.string().min(3),
    grade: z.number().int().min(1).optional(),
    order: z.number().int().min(0).optional(),
    options: z.array(z.object({
      text: z.string(),
      isCorrect: z.boolean().default(false)
    })).optional()
  })
})

const submitAssessmentSchema = z.object({
  body: z.object({
    answers: z.array(z.object({
      questionId: z.string().uuid(),
      selectedOptionId: z.string().uuid().or(z.literal('')).nullable().optional().transform(v => v === '' ? null : v),
      textAnswer: z.string().nullable().optional()
    }))
  })
})

const reviewSubmissionSchema = z.object({
  body: z.object({
    answers: z.array(z.object({
      answerId: z.string().uuid(),
      grade: z.coerce.number().min(0),
      instructorFeedback: z.string().nullable().optional()
    }))
  })
})

module.exports = {
  validateCreateAssessment: validate(createAssessmentSchema),
  validateUpdateAssessment: validate(updateAssessmentSchema),
  validateAddQuestion: validate(addQuestionSchema),
  validateSubmitAssessment: validate(submitAssessmentSchema),
  validateReviewSubmission: validate(reviewSubmissionSchema)
}
