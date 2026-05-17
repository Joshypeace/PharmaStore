import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await request.json()

    await prisma.orderMessage.updateMany({
      where: {
        orderId,
        isFromCustomer: true,
        read: false
      },
      data: { read: true }
    })

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error marking messages as read:', error)
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 })
  }
}