
import { 
  PrismaClient, 
  Prisma, 
  PrescriptionStatus, 
  PermissionModule,
  Role,
   } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { Prisma, PrescriptionStatus, PermissionModule, Role }