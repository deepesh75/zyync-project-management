import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'
  
  // Check if using Turso (libsql)
  if (databaseUrl.startsWith('libsql://')) {
    const libsql = createClient({ url: databaseUrl })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter })
  }
  
  // Default SQLite for local development
  return new PrismaClient()
}

export const prisma = global.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') global.prisma = prisma
