import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      pharmacyId,
      medicineName,
      inventoryItemId,
      quantity,
      customerName,
      customerPhone,
      customerEmail,
      notes
    } = body

    console.log('Place order request:', { pharmacyId, medicineName, inventoryItemId, quantity, customerName, customerPhone })

    // Validate required fields
    if (!pharmacyId || !inventoryItemId || !quantity || !customerName || !customerPhone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the inventory item to verify stock
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { medicine: true, pharmacy: true }
    })

    if (!inventoryItem) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
    }

    if (inventoryItem.quantity < quantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 })
    }

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    // Set reservation expiry (e.g., 2 hours from now)
    const reservationExpiry = new Date()
    reservationExpiry.setHours(reservationExpiry.getHours() + 2)

    // Create the order
    const order = await prisma.medicineOrder.create({
      data: {
        orderNumber,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        status: 'PENDING',
        reservationExpiry,
        medicineId: inventoryItem.medicineId,
        pharmacyId,
        quantity,
        totalPrice: inventoryItem.price * quantity,
        notes: notes || null,
        reservationHistory: {
          create: {
            status: 'PENDING',
            notes: 'Order placed by customer',
            changedBy: 'customer'
          }
        }
      }
    })

    // Create initial order message
    await prisma.orderMessage.create({
      data: {
        orderId: order.id,
        message: `New order placed for ${quantity} x ${inventoryItem.medicine.name}. Please confirm availability.`,
        isFromCustomer: true,
        isFromPharmacy: false
      }
    })

    console.log('Order created successfully:', order.orderNumber)

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      message: 'Order placed successfully. The pharmacy will confirm availability.'
    })
    
  } catch (error) {
    console.error('Order placement error:', error)
    return NextResponse.json({ 
      error: 'Failed to place order', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}