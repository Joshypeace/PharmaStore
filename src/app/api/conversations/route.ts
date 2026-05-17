import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the pharmacy for this user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { pharmacy: true }
    })

    if (!user?.pharmacyId) {
      return NextResponse.json({ conversations: [] })
    }

    // Get all orders with messages for this pharmacy
    const orders = await prisma.medicineOrder.findMany({
      where: {
        pharmacyId: user.pharmacyId,
        OR: [
          { messages: { some: {} } },
          { notes: { not: null } }
        ]
      },
      include: {
        medicine: true,
        messages: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Group messages by customer/order
    const conversations = orders.map(order => {
      const messages = order.messages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      
      const lastMessage = messages[messages.length - 1]
      const unreadCount = messages.filter(m => !m.read && !m.isFromPharmacy).length

      return {
        id: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        lastMessage: lastMessage?.message || order.notes || 'No messages',
        lastMessageTime: lastMessage?.createdAt || order.createdAt,
        unreadCount,
        orderId: order.id,
        orderNumber: order.orderNumber,
        medicineName: order.medicine.name,
        status: order.status,
        messages: messages.map(m => ({
          id: m.id,
          text: m.message,
          isFromCustomer: m.isFromCustomer,
          isFromPharmacy: m.isFromPharmacy,
          createdAt: m.createdAt,
          read: m.read
        }))
      }
    })

    return NextResponse.json({ conversations })
    
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}