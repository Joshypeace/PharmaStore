import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the pharmacy for this user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { pharmacy: true }
    })

    if (!user?.pharmacyId) {
      return NextResponse.json({ error: "Pharmacy not found" }, { status: 404 })
    }

    const orders = await prisma.publicOrder.findMany({
      where: { pharmacyId: user.pharmacyId },
      include: {
        user: {
          select: {
            name: true,
            phoneNumber: true,
            email: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Format orders for frontend
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.user.name,
      customerPhone: order.user.phoneNumber,
      customerEmail: order.user.email,
      status: order.status,
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      reservationFee: order.reservationFee || 500,
      amountToPayAtPickup: (order.totalPrice - (order.reservationFee || 500)),
      notes: order.notes,
      createdAt: order.createdAt,
      reservationExpiry: order.reservationExpiry,
      medicineName: order.medicineName,
      messages: order.messages.map(msg => ({
        id: msg.id,
        message: msg.message,
        isFromCustomer: msg.isFromUser,
        createdAt: msg.createdAt
      }))
    }))

    return NextResponse.json({ orders: formattedOrders })
    
  } catch (error) {
    console.error("Error fetching pharmacy orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}