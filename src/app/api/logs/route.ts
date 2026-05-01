// app/api/logs/route.ts
// Update the import path if your prisma client is at src/lib/prisma.ts or src/lib/prisma/index.ts
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const logs = await prisma.activityLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to 100 most recent logs
    })
    return NextResponse.json(logs)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    )
  }
}