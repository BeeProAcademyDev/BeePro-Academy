require('dotenv').config()
const { getPrismaClient, disconnectPrisma } = require('./src/infrastructure/database/prismaClient')
const bcrypt = require('bcryptjs')

async function seed() {
  const prisma = getPrismaClient()

  try {
    const adminEmail = 'admin@beepro.academy'
    const adminPassword = 'Admin1234!'

    // Check if admin already exists
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (existing) {
      console.log('⚠️  Admin user already exists:', adminEmail)
      return
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12)

    const admin = await prisma.user.create({
      data: {
        full_name: 'Super Admin',
        email: adminEmail,
        password_hash: passwordHash,
        role: 'admin',
        status: 'active',
      },
    })

    console.log('✅ Admin user created successfully!')
    console.log('   Email:', adminEmail)
    console.log('   Password:', adminPassword)
    console.log('   ID:', admin.id)
  } catch (err) {
    console.error('❌ Seed failed:', err.message)
  } finally {
    await disconnectPrisma()
  }
}

seed()
