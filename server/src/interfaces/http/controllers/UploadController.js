class UploadController {
  constructor({ cloudinaryMediaService }) {
    this.cloudinaryMediaService = cloudinaryMediaService
  }

  /**
   * Endpoint to get a signature for secure client-side direct uploads to Cloudinary.
   */
  getUploadSignature = (req, res, next) => {
    try {
      const { folder } = req.query // e.g., ?folder=course-thumbnails
      const signatureData = this.cloudinaryMediaService.generateUploadSignature(folder || 'general')
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

      const { folder } = req.body // optionally pass a folder in the form-data
      const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image'

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
          duration: result.duration // will be present if video
        }
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = UploadController
