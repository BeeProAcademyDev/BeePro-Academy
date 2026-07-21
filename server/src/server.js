require('dotenv').config()
const createApp = require('./app')
const createContainer = require('./container')
const config = require('./config')
const { disconnectPrisma } = require('./infrastructure/database/prismaClient')

async function startServer() {
  try {
    const container = createContainer()
    const app = createApp(container)

    // Test DB connection
    await container.prisma.$connect()
    console.log('✅ Connected to database')

    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${config.port} in ${config.env} mode`)
    })

    // Graceful shutdown
    const shutdown = async () => {
      console.log(' shutting down...')
      server.close(async () => {
        await disconnectPrisma()
        console.log('✅ Server closed. Database disconnected.')
        process.exit(0)
      })
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (err) {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
  }
}

startServer()

// Keep the event loop alive to prevent clean exit issues
setInterval(() => {}, 1000 * 60 * 60)
