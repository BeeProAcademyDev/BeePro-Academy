const { z } = require('zod')
const validate = require('../middlewares/validate')

const createBlogPostSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    content: z.string().min(10, 'Content must be at least 10 characters'),
    category: z.string().min(1, 'Category is required'),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional().nullable(),
    imageUrl: z.string().url().optional().nullable()
  })
})

const updateBlogPostSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    content: z.string().min(10).optional(),
    category: z.string().min(1).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional().nullable(),
    imageUrl: z.string().url().optional().nullable()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update'
  })
})

module.exports = {
  validateCreateBlogPost: validate(createBlogPostSchema),
  validateUpdateBlogPost: validate(updateBlogPostSchema)
}
