const { AuthorizationError, NotFoundError, ValidationError } = require('../../../domain/errors/AppError')

class UploadController {
  constructor({ cloudinaryMediaService, courseRepository, lessonRepository, blogPostRepository }) {
    this.cloudinaryMediaService = cloudinaryMediaService
    this.courseRepository = courseRepository
    this.lessonRepository = lessonRepository
    this.blogPostRepository = blogPostRepository
  }

  /**
   * Endpoint to get a signature for secure client-side direct uploads to Cloudinary.
   * Expects req.body: { type, courseId?, lessonId?, blogId? }
   */
  getUploadSignature = async (req, res, next) => {
    try {
      const { type, courseId, lessonId, blogId } = req.body
      const userId = req.user.id
      const isAdmin = req.user.role === 'admin'

      let folder = ''
      let resourceType = 'auto'

      switch (type) {
        case 'courseThumbnail': {
          if (!isAdmin) {
            const course = await this.courseRepository.findById(courseId)
            if (!course || (course.instructor_id !== userId && course.instructorId !== userId)) {
              throw new AuthorizationError('You do not have permission to upload to this course')
            }
          }
          folder = `courses/${courseId}/thumbnail`
          resourceType = 'image'
          break
        }
        
        case 'lessonFile':
        case 'lessonVideo': {
          if (!isAdmin) {
            const course = await this.courseRepository.findById(courseId)
            if (!course || (course.instructor_id !== userId && course.instructorId !== userId)) {
              throw new AuthorizationError('You do not have permission to upload to this course')
            }
          }
          folder = type === 'lessonVideo' 
            ? `courses/${courseId}/${lessonId}/videos`
            : `courses/${courseId}/${lessonId}/files`
          resourceType = type === 'lessonVideo' ? 'video' : 'auto'
          break
        }

        case 'blogImage': {
          if (!isAdmin) {
            const post = await this.blogPostRepository.findById(blogId)
            if (!post || post.authorId !== userId) {
              throw new AuthorizationError('You do not have permission to upload images for this blog post')
            }
          }
          folder = `blog/${blogId}/images`
          resourceType = 'image'
          break
        }

        case 'profileImage': {
          folder = `users/${userId}/profile`
          resourceType = 'image'
          break
        }

        default:
          throw new ValidationError('Invalid upload type')
      }

      const signatureData = this.cloudinaryMediaService.generateUploadSignature(folder)
      // Attach the specific resourceType so the frontend knows what endpoint to hit
      signatureData.resourceType = resourceType

      res.status(200).json({ status: 'success', data: signatureData })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Endpoint for server-side uploads (e.g. from a form-data request via multer).
   */
  uploadFile = async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file provided' })
      }

      const isImage = req.file.mimetype.startsWith('image/')
      const isVideo = req.file.mimetype.startsWith('video/')
      
      // Enforce 5MB limit for images
      if (isImage && req.file.size > 5 * 1024 * 1024) {
        throw new ValidationError('Image file size cannot exceed 5MB')
      }

      const { folder } = req.body // optionally pass a folder in the form-data
      const resourceType = isVideo ? 'video' : 'image'

      const result = await this.cloudinaryMediaService.uploadFromBuffer(
        req.file.buffer,
        folder || 'general',
        resourceType
      )

      res.status(200).json({
        status: 'success',
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          resourceType: result.resource_type,
          duration: result.duration ? Math.round(result.duration) : undefined
        }
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = UploadController
