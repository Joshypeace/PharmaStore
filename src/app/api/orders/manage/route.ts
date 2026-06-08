import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"

const prisma = new PrismaClient()

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { orderId, action } = await request.json()

    if (!orderId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the order
    const order = await prisma.publicOrder.findUnique({
      where: { id: orderId },
      include: {
        user: true,
      }
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    let updatedOrder
    let notificationTitle = ""
    let notificationMessage = ""

    switch (action) {
      case "confirm":
        updatedOrder = await prisma.publicOrder.update({
          where: { id: orderId },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
          }
        })
        notificationTitle = "Order Confirmed"
        notificationMessage = `Your order #${order.orderNumber} has been confirmed. Medicine reserved until ${new Date(order.reservationExpiry).toLocaleTimeString()}.`
        break

      case "ready":
        updatedOrder = await prisma.publicOrder.update({
          where: { id: orderId },
          data: {
            status: "READY_FOR_COLLECTION",
            readyAt: new Date(),
          }
        })
        notificationTitle = "Ready for Collection"
        notificationMessage = `Your order #${order.orderNumber} is ready for pickup! Please collect within 2 hours.`
        break

      case "collected":
        updatedOrder = await prisma.publicOrder.update({
          where: { id: orderId },
          data: {
            status: "COLLECTED",
            collectedAt: new Date(),
            collectedBy: session.user.email || "Pharmacy Staff",
          }
        })
        notificationTitle = "Order Collected"
        notificationMessage = `Thank you for collecting order #${order.orderNumber}. We hope to serve you again!`
        break

      case "cancel":
        updatedOrder = await prisma.publicOrder.update({
          where: { id: orderId },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          }
        })
        
        // Return inventory back if it was deducted
        const inventoryItem = await prisma.inventoryItem.findFirst({
          where: {
            pharmacyId: order.pharmacyId,
            medicineId: order.medicineId,
          }
        })
        if (inventoryItem) {
          await prisma.inventoryItem.update({
            where: { id: inventoryItem.id },
            data: {
              quantity: {
                increment: order.quantity
              }
            }
          })
        }
        
        notificationTitle = "Order Cancelled"
        notificationMessage = `Order #${order.orderNumber} has been cancelled.`
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Create history entry
    await prisma.publicOrderHistory.create({
      data: {
        orderId: order.id,
        status: updatedOrder.status,
        notes: `Order ${action}ed by pharmacy`,
        changedBy: session.user.email || "Pharmacy Staff",
      }
    })

    // Create notification for user
    await prisma.publicNotification.create({
      data: {
        userId: order.userId,
        title: notificationTitle,
        message: notificationMessage,
        type: "ORDER_UPDATE",
        relatedOrderId: order.id,
      }
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: `Order ${action}ed successfully`
    })
    
  } catch (error) {
    console.error("Order management error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}