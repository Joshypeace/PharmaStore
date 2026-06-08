// app/api/public/order-status/route.ts
import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderNumber = searchParams.get("orderNumber")

    if (!orderNumber) {
      return NextResponse.json({ error: "Order number required" }, { status: 400 })
    }

    const order = await prisma.publicOrder.findUnique({
      where: { orderNumber },
      include: {
        pharmacy: {
          select: {
            id: true,
            name: true,
            phone: true,
            location: true,
            latitude: true,
            longitude: true,
          }
        },
        history: {
          orderBy: { changedAt: 'asc' }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        medicineName: order.medicineName,
        quantity: order.quantity,
        totalPrice: order.totalPrice,
        reservationFee: order.reservationFee,
        amountToPayAtPickup: order.totalPrice - order.reservationFee,
        reservationExpiry: order.reservationExpiry,
        pharmacy: order.pharmacy,
        history: order.history
      }
    })
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
