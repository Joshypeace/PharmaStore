// app/api/orders/create/route.ts
import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      pharmacyId,
      medicineId,
      medicineName,
      quantity,
      customerName,
      customerPhone,
      customerEmail,
      notes,
      contactMethod,
      totalPrice,
    } = body

    // Validate required fields
    if (!pharmacyId || !medicineId || !quantity || !customerName || !customerPhone) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if medicine exists in pharmacy inventory
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        pharmacyId: pharmacyId,
        medicineId: medicineId,
        quantity: {
          gte: quantity,
        },
      },
    })

    if (!inventoryItem) {
      return NextResponse.json(
        { message: "Medicine not available in requested quantity" },
        { status: 400 }
      )
    }

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Calculate reservation expiry (2 hours from now)
    const reservationExpiry = new Date()
    reservationExpiry.setHours(reservationExpiry.getHours() + 2)

    // Create order
    const order = await prisma.medicineOrder.create({
      data: {
        orderNumber,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        quantity,
        totalPrice,
        notes: notes || null,
        confirmedVia: contactMethod === "call" ? "PHONE_CALL" : contactMethod === "whatsapp" ? "WHATSAPP" : "SMS",
        reservationExpiry,
        medicine: {
          connect: { id: medicineId },
        },
        pharmacy: {
          connect: { id: pharmacyId },
        },
        status: "PENDING",
      },
    })

    // Create initial message
    await prisma.orderMessage.create({
      data: {
        orderId: order.id,
        message: `Order placed for ${quantity} unit(s). Awaiting pharmacy confirmation.`,
        isFromCustomer: true,
        isFromPharmacy: false,
      },
    })

    // Create reservation history entry
    await prisma.reservationHistory.create({
      data: {
        orderId: order.id,
        status: "PENDING",
        notes: "Order created and awaiting confirmation",
        changedBy: customerName,
      },
    })

    // Optionally reduce inventory temporarily (soft reserve)
    // You might want to implement a separate reservation system
    await prisma.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    })

    return NextResponse.json({
      success: true,
      orderId: order.orderNumber,
      message: "Order created successfully",
    })
  } catch (error) {
    console.error("Order creation error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}