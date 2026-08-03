const { z } = require('zod')

const createReviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
    comment: z.string().max(1000).optional().nullable()
  })
})

const updateReviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(1000).optional().nullable()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update'
  })
})

module.exports = {
  createReviewSchema,
  updateReviewSchema
}
