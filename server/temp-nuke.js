require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

async function nuke() {
  const prisma = new PrismaClient()
  try {
    console.log('Nuking the entire public schema to start completely fresh...')
    
    // Drop the entire schema and everything inside it (tables, views, functions, policies)
    await prisma.$executeRawUnsafe(`DROP SCHEMA public CASCADE;`)
    
    // Recreate an empty public schema
    await prisma.$executeRawUnsafe(`CREATE SCHEMA public;`)
    
    // Restore permissions so Prisma and users can use it
    await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO postgres;`)
    await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO public;`)
    
    console.log('✅ Database is completely empty and ready for the new schema!')
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}
nuke()
