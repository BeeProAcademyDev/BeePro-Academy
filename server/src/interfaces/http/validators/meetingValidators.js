const { z } = require('zod')
const validate = require('../middlewares/validate')

const createMeetingSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    scheduledAt: z.string().datetime({ message: 'Must be a valid ISO 8601 date' }),
    durationMinutes: z.number().int().min(10).max(480).optional().default(60)
  })
})

const updateMeetingSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    scheduledAt: z.string().datetime({ message: 'Must be a valid ISO 8601 date' }).optional(),
    durationMinutes: z.number().int().min(10).max(480).optional(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional()
  })
})

module.exports = {
  validateCreateMeeting: validate(createMeetingSchema),
  validateUpdateMeeting: validate(updateMeetingSchema)
}
