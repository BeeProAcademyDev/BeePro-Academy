const { PrismaClient } = require('@prisma/client')

let prisma

/**
 * Singleton Prisma client — reuses the same connection across the app.
 */
function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  }
  return prisma
}

/**
 * Graceful disconnect.
 */
async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}

module.exports = { getPrismaClient, disconnectPrisma }
