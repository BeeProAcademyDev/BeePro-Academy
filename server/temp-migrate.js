require('dotenv').config()
const { getPrismaClient, disconnectPrisma } = require('./src/infrastructure/database/prismaClient')

async function check() {
  const prisma = getPrismaClient()
  const pending = await prisma.user.findMany({
    where: { role: 'instructor', status: 'pending' },
    select: { id: true, full_name: true, email: true, role: true, status: true },
  })
  console.log('Pending instructors:', pending.length)
  pending.forEach(u => console.log(`  - ${u.id} | ${u.full_name} | ${u.email} | ${u.status}`))

  const all = await prisma.user.findMany({
    select: { id: true, full_name: true, email: true, role: true, status: true },
  })
  console.log('\nAll users:')
  all.forEach(u => console.log(`  - ${u.id} | ${u.full_name} | ${u.email} | role=${u.role} | status=${u.status}`))

  await disconnectPrisma()
}
check()
