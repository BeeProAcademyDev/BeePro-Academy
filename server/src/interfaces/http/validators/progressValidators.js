const { z } = require('zod');

const updateLessonProgressSchema = z.object({
  body: z.object({
    is_completed: z.boolean().optional(),
    watch_time_seconds: z.number().int().min(0).optional(),
    completion_percentage: z.number().int().min(0).max(100).optional(),
    course_id: z.string().uuid('Invalid course ID').optional()
  })
});

module.exports = {
  updateLessonProgressSchema
};
