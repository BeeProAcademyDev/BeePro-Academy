require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

async function fix() {
  const prisma = new PrismaClient()
  try {
    console.log('Dropping old views that block Prisma updates...')
    await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS course_overview CASCADE;`)
    // Also drop certificates if it was blocking earlier
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS certificates CASCADE;`)
    console.log('✅ Old views and blocking tables dropped successfully!')
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}
fix()
