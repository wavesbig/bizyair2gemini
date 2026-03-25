import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 初始化设置
  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  })

  if (!settings) {
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123'
    await prisma.settings.create({
      data: {
        id: 'default',
        password: await bcrypt.hash(defaultPassword, 10),
        apiKey: process.env.PROXY_API_KEY || '',
      },
    })
    console.log('Settings created')
  }

  console.log('Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
