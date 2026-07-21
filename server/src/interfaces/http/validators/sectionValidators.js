const { z } = require('zod')

const createSectionSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters')
  })
})

const updateSectionSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').optional(),
    order: z.number().int().min(0).optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided'
  })
})

module.exports = { createSectionSchema, updateSectionSchema }
