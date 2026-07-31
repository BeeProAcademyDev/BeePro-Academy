const { Router } = require('express')
const upload = require('../middlewares/upload')

function createUploadRoutes(uploadController, authenticate) {
  const router = Router()

  // Apply authentication to all upload routes
  router.use(authenticate)

  // GET /api/v1/upload/signature -> gets credentials for direct client-side upload to Cloudinary
  router.get('/signature', uploadController.getUploadSignature)

  // POST /api/v1/upload -> direct server-side upload endpoint
  router.post('/', upload.single('file'), uploadController.uploadFile)

  return router
}

module.exports = createUploadRoutes
