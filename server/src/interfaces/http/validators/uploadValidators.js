const { z } = require('zod')
const validate = require('../middlewares/validate')

const generateSignatureSchema = z.object({
  body: z.object({
    type: z.enum([
      'courseThumbnail',
      'lessonFile',
      'lessonVideo',
      'blogImage',
      'profileImage'
    ]),
    courseId: z.string().uuid().optional(),
    lessonId: z.string().uuid().optional(),
    blogId: z.string().uuid().optional()
  }).refine((data) => {
    switch (data.type) {
      case 'courseThumbnail':
        return !!data.courseId
      case 'lessonFile':
      case 'lessonVideo':
        return !!data.courseId && !!data.lessonId
      case 'blogImage':
        return !!data.blogId
      case 'profileImage':
        return true // Uses req.user.id, no extra IDs needed
      default:
        return false
    }
  }, {
    message: 'Missing required IDs for the specified upload type'
  })
})

module.exports = {
  validateGenerateSignature: validate(generateSignatureSchema)
}
