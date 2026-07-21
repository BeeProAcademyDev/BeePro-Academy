require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const config = require('./config')
const errorHandler = require('./interfaces/http/middlewares/errorHandler')
const authenticateMiddleware = require('./interfaces/http/middlewares/authenticate')
const authorizeMiddleware = require('./interfaces/http/middlewares/authorize')
const createAuthRoutes = require('./interfaces/http/routes/authRoutes')
const createAdminRoutes = require('./interfaces/http/routes/adminRoutes')
const createCourseRoutes = require('./interfaces/http/routes/courseRoutes')
const optionalAuthenticateMiddleware = require('./interfaces/http/middlewares/optionalAuthenticate')
const createSectionRoutes =require('./interfaces/http/routes/sectionRoutes')

function createApp(container) {
  const app = express()

  // Middlewares
  app.use(helmet())
  const allowedOrigins = typeof config.clientUrl === 'string'
    ? config.clientUrl.split(',').map(url => url.trim())
    : config.clientUrl

  // Allow CORS from any origin. `origin: true` reflects request origin —
  // keeps `credentials: true` usable (unlike `origin: '*'`).
  app.use(cors({
    origin: true,
    credentials: true
  }))
  app.use(express.json())
  app.use(morgan('dev'))

  // Inject dependencies into auth middleware
  const authenticate = authenticateMiddleware(container.tokenService)
  const authorize = authorizeMiddleware
  const optionalAuthenticate = optionalAuthenticateMiddleware(container.tokenService)

  // Routes
  const authRoutes = createAuthRoutes(container.authController, authenticate, authorize)
  app.use('/api/v1/auth', authRoutes)

  const adminRoutes = createAdminRoutes(container.adminController, authenticate, authorize)
  app.use('/api/v1/admin', adminRoutes)

  const courseRoutes = createCourseRoutes(container.courseController, authenticate, authorize, optionalAuthenticate)
  app.use('/api/v1/courses', courseRoutes)

  const createCategoryRoutes = require('./interfaces/http/routes/categoryRoutes')

  const categoryRoutes = createCategoryRoutes(container.categoryController, authenticate, authorize)
  app.use('/api/v1/categories', categoryRoutes)

  const sectionRoutes = createSectionRoutes(container.sectionController, authenticate, authorize)
  app.use('/api/v1/courses/:courseId/sections', sectionRoutes)

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' })
  })

  // Global Error Handler (must be last)
  app.use(errorHandler)

  return app
}

module.exports = createApp
