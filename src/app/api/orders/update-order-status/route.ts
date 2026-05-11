import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, status } = await request.json()

    const order = await prisma.medicineOrder.update({
      where: { id: orderId },
      data: { status },
      include: { pharmacy: true, medicine: true }
    })

    // Add to reservation history
    await prisma.reservationHistory.create({
      data: {
        orderId: order.id,
        status: status,
        notes: `Status changed to ${status} by pharmacy staff`,
        changedBy: session.user.email || 'pharmacy'
      }
    })

    // Add order message
    await prisma.orderMessage.create({
      data: {
        orderId: order.id,
        message: `Order status updated to: ${status}`,
        isFromCustomer: false,
        isFromPharmacy: true
      }
    })

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}