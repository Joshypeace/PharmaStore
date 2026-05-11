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

    // Get the order
    const order = await prisma.medicineOrder.findUnique({
      where: { id: orderId },
      include: { medicine: true }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Find the inventory item
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        medicineId: order.medicineId,
        pharmacyId: order.pharmacyId,
        quantity: { gte: order.quantity }
      }
    })

    if (!inventoryItem) {
      return NextResponse.json({ error: 'Insufficient inventory' }, { status: 400 })
    }

    // Deduct inventory
    await prisma.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: { quantity: { decrement: order.quantity } }
    })

    // Create sale record
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    await prisma.sale.create({
      data: {
        itemId: inventoryItem.id,
        quantity: order.quantity,
        totalPrice: order.totalPrice,
        userId: user?.id || '',
        prescriptionId: null
      }
    })

    // Update order with collection details
    await prisma.medicineOrder.update({
      where: { id: orderId },
      data: {
        collectedAt: new Date(),
        collectedBy: user?.name || session.user.email
      }
    })

    // Create activity log
    await prisma.activityLog.create({
      data: {
        type: 'SALE',
        message: `Order ${order.orderNumber} collected and inventory deducted`,
        userId: user?.id || ''
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deducting inventory:', error)
    return NextResponse.json({ error: 'Failed to deduct inventory' }, { status: 500 })
  }
}