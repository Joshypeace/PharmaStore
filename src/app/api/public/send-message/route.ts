import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { pharmacyId, message } = await request.json()
    
    if (!pharmacyId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Create a temporary order or conversation
    // For now, we'll store messages in a session or create a temporary order
    const order = await prisma.medicineOrder.create({
      data: {
        orderNumber: `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        customerName: 'Guest User',
        customerPhone: 'Pending',
        status: 'PENDING',
        reservationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        medicineId: (await prisma.medicine.findFirst())?.id || '',
        pharmacyId,
        quantity: 0,
        totalPrice: 0,
        notes: message
      }
    })
    
    await prisma.orderMessage.create({
      data: {
        orderId: order.id,
        message: message,
        isFromCustomer: true,
        isFromPharmacy: false
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      messageId: order.id,
      message: 'Message sent successfully' 
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}