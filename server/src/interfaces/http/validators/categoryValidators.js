const { z } = require('zod')

const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    description: z.string().optional().nullable()
  })
})

const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Name must be at least 3 characters').optional(),
    description: z.string().optional().nullable()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided'
  })
})

module.exports = { createCategorySchema, updateCategorySchema }
