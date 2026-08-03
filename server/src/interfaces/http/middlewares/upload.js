const multer = require('multer')
const { AppError } = require('../../../domain/errors/AppError')

// Use memory storage for direct Cloudinary upload from buffer
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  // Accept images and videos
  if (file.mimetype.startsWith('image/')) {
    // We check the limit in the route or just let multer handle global limits.
    // Multer's fileFilter doesn't have access to the full file size until it streams.
    // We'll set a global limit but also we can check headers.
    cb(null, true)
  } else if (file.mimetype.startsWith('video/')) {
    cb(null, true)
  } else {
    cb(new AppError('Not an image or video! Please upload only images or videos.', 400, 'BAD_REQUEST'), false)
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit globally, we will check image size specifically in the controller if needed
  },
  fileFilter
})

module.exports = upload
