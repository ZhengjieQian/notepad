// Prisma Client Setup - Database connection management
// This file implements the singleton pattern to prevent multiple Prisma Client instances
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
  // eslint-disable-next-line no-var
  var prismaPgPool: Pool | undefined
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaPgPool: Pool | undefined
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = globalForPrisma.prismaPgPool ?? new Pool({ connectionString: databaseUrl })
const adapter = new PrismaPg(pool)

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaPgPool = pool
}

export default prisma