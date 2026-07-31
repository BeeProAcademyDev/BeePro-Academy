const multer = require('multer')
const { AppError } = require('../../../domain/errors/AppError')

// Use memory storage for direct Cloudinary upload from buffer
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  // Accept images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true)
  } else {
    cb(new AppError('Not an image or video! Please upload only images or videos.', 400, 'BAD_REQUEST'), false)
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for testing videos
  },
  fileFilter
})

module.exports = upload
