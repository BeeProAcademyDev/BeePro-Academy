const { Router } = require('express')
const rateLimit = require('express-rate-limit')
const upload = require('../middlewares/upload')
const { validateGenerateSignature } = require('../validators/uploadValidators')

// Rate limiting for signature generation (e.g., max 10 requests per minute)
const signatureLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 signature requests per windowMs
  message: { status: 'error', message: 'Too many upload requests, please try again later.' }
})

function createUploadRoutes(uploadController, authenticate, authorize) {
  const router = Router()

  // Apply authentication to all upload routes
  router.use(authenticate)

  // POST /api/v1/upload/signature -> gets credentials for direct client-side upload to Cloudinary
  // Any authenticated user can hit this, but the controller authorizes based on `type`
  router.post(
    '/signature', 
    signatureLimiter, 
    validateGenerateSignature, 
    uploadController.getUploadSignature
  )

  // POST /api/v1/upload -> direct server-side upload endpoint (restricted to instructor/admin)
  router.post('/', authorize('instructor', 'admin'), upload.single('file'), uploadController.uploadFile)

  return router
}

module.exports = createUploadRoutes
