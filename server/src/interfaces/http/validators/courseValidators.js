const { z } = require('zod')

const createCourseSchema = z.object({
  body: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().optional().nullable(),
    price: z.number().min(0, 'Price cannot be negative').optional(),
    categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  }),
})

const updateCourseSchema = z.object({
  body: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').optional(),
    description: z.string().optional().nullable(),
    price: z.number().min(0, 'Price cannot be negative').optional(),
    status: z.enum(['draft', 'published', 'archived'], {
      errorMap: () => ({ message: 'Status must be draft, published, or archived' })
    }).optional(),
    categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  }),
})

module.exports = { createCourseSchema, updateCourseSchema }
