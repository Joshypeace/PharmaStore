// app/api/public/place-order/route.ts
import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      pharmacyId,
      inventoryItemId,         // primary lookup key — always present from search results
      medicineId,              // optional, kept for order record if available
      medicineName,
      quantity,
      notes,
      reservationFee = 500,   // MWK 500 reservation fee
    } = body

    // Validate required fields — inventoryItemId replaces medicineId as the required key
    if (!userId || !pharmacyId || !inventoryItemId || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Get user
    const user = await prisma.publicUser.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Look up inventory item directly by its ID, with stock and pharmacy safety checks
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        id: inventoryItemId,
        pharmacyId: pharmacyId,      // ensure it belongs to the expected pharmacy
        quantity: { gte: quantity }, // ensure enough stock
      },
      include: {
        medicine: true
      }
    })

    if (!inventoryItem) {
      return NextResponse.json(
        { error: "Medicine not available in requested quantity" },
        { status: 400 }
      )
    }

    // Calculate totals
    const unitPrice = inventoryItem.price
    const totalPrice = unitPrice * quantity

    const reservationExpiry = new Date()
    reservationExpiry.setHours(reservationExpiry.getHours() + 2) // 2 hour reservation window

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Resolve medicineId: prefer what was passed, fall back to what's on the inventory item
    const resolvedMedicineId = medicineId || inventoryItem.medicineId

    // Create order
    const order = await prisma.publicOrder.create({
      data: {
        orderNumber,
        userId: user.id,
        pharmacyId,
        medicineId: resolvedMedicineId,
        medicineName,
        quantity,
        unitPrice,
        totalPrice,
        reservationFee,
        notes: notes || null,
        reservationExpiry,
        status: "PENDING",
      }
    })

    // Create order history entry
    await prisma.publicOrderHistory.create({
      data: {
        orderId: order.id,
        status: "PENDING",
        notes: "Order placed, awaiting pharmacy confirmation",
        changedBy: user.name,
      }
    })

    // Notify user
    await prisma.publicNotification.create({
      data: {
        userId: user.id,
        title: "Order Placed",
        message: `Your order #${orderNumber} has been placed. Waiting for pharmacy confirmation.`,
        type: "ORDER_UPDATE",
        relatedOrderId: order.id,
      }
    })

    // Soft-reserve: decrement inventory
    await prisma.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        quantity: {
          decrement: quantity
        }
      }
    })

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalPrice: order.totalPrice,
        reservationFee: order.reservationFee,
        amountToPayAtPickup: totalPrice - reservationFee,
        reservationExpiry: order.reservationExpiry,
      },
      message: "Order placed successfully! Please wait for pharmacy confirmation."
    })

  } catch (error) {
    console.error("Order placement error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}