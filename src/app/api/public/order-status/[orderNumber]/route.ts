import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const params = await context.params
    const order = await prisma.medicineOrder.findUnique({
      where: { orderNumber: params.orderNumber },
      include: {
        pharmacy: true,
        medicine: true,
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}