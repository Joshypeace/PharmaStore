import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, message } = await request.json()

    const orderMessage = await prisma.orderMessage.create({
      data: {
        orderId,
        message,
        isFromCustomer: false,
        isFromPharmacy: true
      }
    })

    // Here you can also send SMS/WhatsApp to customer
    // await sendSMSToCustomer(order.customerPhone, message)

    return NextResponse.json({ success: true, message: orderMessage })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}