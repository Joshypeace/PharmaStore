// app/api/reorder/route.ts
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

    if (!pharmacyId) {
      return NextResponse.json({ error: "Pharmacy ID required" }, { status: 400 })
    }

    // Get all inventory items with low stock
    const inventory = await prisma.inventoryItem.findMany({
      where: {
        pharmacyId,
        quantity: { lt: 20 }
      },
      include: {
        medicine: true
      }
    })

    const recommendations = []
    
    for (const item of inventory) {
      // Skip if enough stock
      if (item.quantity >= 20) continue
      
      // Calculate priority
      let priority = "MEDIUM"
      if (item.quantity < 5) priority = "HIGH"
      else if (item.quantity < 10) priority = "MEDIUM"
      else priority = "LOW"
      
      // Calculate days until stockout (assuming average daily sales of 3 units)
      const avgDailySales = 3
      const daysUntilStockout = Math.max(1, Math.ceil(item.quantity / avgDailySales))
      
      // Calculate recommended quantity (2 weeks supply)
      const recommendedQuantity = Math.max(30, Math.ceil(avgDailySales * 14))
      
      recommendations.push({
        id: item.id,
        medicine: { name: item.medicine.name },
        recommendedQuantity,
        currentStock: item.quantity,
        daysUntilStockout,
        priority,
        status: "PENDING"
      })
    }
    
    // Sort by priority
    recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
    })

    return NextResponse.json({ recommendations })
    
  } catch (error) {
    console.error("Reorder recommendations error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { pharmacyId, generate } = body

    if (generate && pharmacyId) {
      // Force generation of recommendations
      const recommendations = await prisma.inventoryItem.findMany({
        where: {
          pharmacyId,
          quantity: { lt: 20 }
        },
        include: { medicine: true }
      })
      
      return NextResponse.json({ 
        message: `Analyzed ${recommendations.length} items`, 
        recommendations: recommendations.length 
      })
    }
    
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    
  } catch (error) {
    console.error("Generate reorder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { recommendationId, action } = body

    // In a real implementation, you would update a reorder record
    // For now, just return success
    
    return NextResponse.json({ 
      success: true, 
      message: `Order ${action}ed successfully` 
    })
    
  } catch (error) {
    console.error("Reorder action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}