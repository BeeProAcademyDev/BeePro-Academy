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

function createApp(container) {
  const app = express()

  // Middlewares
  app.use(helmet())
  const allowedOrigins = typeof config.clientUrl === 'string'
    ? config.clientUrl.split(',').map(url => url.trim())
    : config.clientUrl

  app.use(cors({
    origin: allowedOrigins, // Fixes ZAP Cross-Domain Misconfiguration
    credentials: true
  }))
  app.use(express.json())
  app.use(morgan('dev'))

  // Inject dependencies into auth middleware
  const authenticate = authenticateMiddleware(container.tokenService)
  const authorize = authorizeMiddleware

  // Routes
  const authRoutes = createAuthRoutes(container.authController, authenticate, authorize)
  app.use('/api/v1/auth', authRoutes)

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' })
  })

  // Global Error Handler (must be last)
  app.use(errorHandler)

  return app
}

module.exports = createApp
