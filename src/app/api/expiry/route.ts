// app/api/expiry/route.ts
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

    const { searchParams } = new URL(request.url)
    const pharmacyId = searchParams.get("pharmacyId")
    const scan = searchParams.get("scan") === "true"

    if (!pharmacyId) {
      return NextResponse.json({ error: "Pharmacy ID required" }, { status: 400 })
    }

    // Get all inventory items with expiry dates
    const inventory = await prisma.inventoryItem.findMany({
      where: {
        pharmacyId,
        expiryDate: { not: null }
      },
      include: {
        medicine: true
      }
    })

    const today = new Date()
    const expiringItems = []
    let totalPotentialLoss = 0

    for (const item of inventory) {
      if (!item.expiryDate) continue
      
      const expiryDate = new Date(item.expiryDate)
      const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
      const totalValue = item.quantity * item.price
      
      // Only include items expiring within 90 days
      if (daysRemaining <= 90 && daysRemaining > 0) {
        expiringItems.push({
          id: item.id,
          name: item.medicine.name,
          batchNumber: item.batch || 'N/A',
          quantity: item.quantity,
          price: item.price,
          totalValue: totalValue,
          daysRemaining: daysRemaining,
          status: daysRemaining <= 30 ? 'Expiring Soon' : 'OK'
        })
        
        if (daysRemaining <= 30) {
          totalPotentialLoss += totalValue
        }
      }
    }

    // Sort by days remaining (closest first)
    expiringItems.sort((a, b) => a.daysRemaining - b.daysRemaining)

    const totalExpiringItems = expiringItems.filter(i => i.daysRemaining <= 30).length
    const criticalCount = expiringItems.filter(i => i.daysRemaining <= 7).length
    const warningCount = expiringItems.filter(i => i.daysRemaining > 7 && i.daysRemaining <= 30).length

    // If scan was requested, also update expiry tracking records
    if (scan) {
      for (const item of inventory) {
        if (!item.expiryDate) continue
        
        const expiryDate = new Date(item.expiryDate)
        const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
        
        let status = "ACTIVE"
        if (daysRemaining < 0) status = "EXPIRED"
        else if (daysRemaining <= 7) status = "EXPIRING_CRITICAL"
        else if (daysRemaining <= 30) status = "EXPIRING_SOON"

        const existingTracking = await prisma.expiryTracking.findFirst({
          where: { inventoryItemId: item.id }
        })

        if (existingTracking) {
          await prisma.expiryTracking.update({
            where: { id: existingTracking.id },
            data: {
              expiryDate,
              remainingDays: daysRemaining,
              status: status as any,
              quantity: item.quantity
            }
          })
        } else {
          await prisma.expiryTracking.create({
            data: {
              inventoryItemId: item.id,
              pharmacyId,
              medicineId: item.medicineId,
              batchNumber: item.batch || "N/A",
              expiryDate,
              quantity: item.quantity,
              remainingDays: daysRemaining,
              status: status as any
            }
          })
        }
      }
    }

    return NextResponse.json({
      items: expiringItems,
      totalExpiringItems,
      criticalCount,
      warningCount,
      potentialLoss: totalPotentialLoss,
      message: scan ? "Inventory scan completed" : undefined
    })
    
  } catch (error) {
    console.error("Expiry monitoring error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}