const cloudinary = require('cloudinary').v2

class CloudinaryMediaService {
  constructor() {
    // Cloudinary config should be in environment variables:
    // CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
    // Or configured explicitly if env vars are separate.
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      })
    }
  }

  /**
   * Uploads a file buffer directly to Cloudinary.
   * Useful for server-side uploads via Multer memory storage.
   * @param {Buffer} fileBuffer - The file buffer to upload
   * @param {string} folder - The destination folder in Cloudinary
   * @param {string} resourceType - 'image' or 'video' or 'auto'
   * @returns {Promise<Object>} The Cloudinary upload result
   */
  async uploadFromBuffer(fileBuffer, folder = 'general', resourceType = 'auto') {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType },
        (error, result) => {
          if (error) return reject(error)
          resolve(result)
        }
      )
      
      const stream = require('stream')
      const bufferStream = new stream.PassThrough()
      bufferStream.end(fileBuffer)
      bufferStream.pipe(uploadStream)
    })
  }

  /**
   * Generates a signed upload signature so the frontend can upload directly to Cloudinary
   * without passing the file through the Node.js backend.
   * @param {string} folder - The folder to upload to (e.g., 'course-thumbnails' or 'lesson-videos')
   * @returns {Object} signature, timestamp, and cloud name
   */
  generateUploadSignature(folder) {
    const timestamp = Math.round(new Date().getTime() / 1000)
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      cloudinary.config().api_secret
    )

    return {
      timestamp,
      signature,
      cloudName: cloudinary.config().cloud_name,
      apiKey: cloudinary.config().api_key,
      folder
    }
  }

  /**
   * Extracts video duration from Cloudinary URL or public ID if needed.
   * Note: The frontend upload widget automatically returns `duration` for videos, 
   * so the backend usually just receives it in the request body. 
   * This is a utility for backend verification if required.
   */
  async getVideoDetails(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId, { resource_type: 'video' })
      return {
        duration: result.duration, // in seconds
        format: result.format,
        secure_url: result.secure_url
      }
    } catch (error) {
      throw new Error('Failed to fetch video details from Cloudinary')
    }
  }
}

module.exports = CloudinaryMediaService
