// app/api/pharmacy/reorder/route.ts
import { NextRequest, NextResponse } from "next/server"
import { ReorderService } from "@/lib/services/reorder.service"
import { getServerSession } from "next-auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const pharmacyId = searchParams.get("pharmacyId")
    const status = searchParams.get("status") || undefined
    
    if (!pharmacyId) {
      return NextResponse.json({ error: "Pharmacy ID required" }, { status: 400 })
    }
    
    const recommendations = await ReorderService.getRecommendations(pharmacyId, status)
    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error("Reorder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const body = await request.json()
    const { pharmacyId, generate } = body
    
    if (generate) {
      const recommendations = await ReorderService.generateRecommendations(pharmacyId)
      return NextResponse.json({ message: "Recommendations generated", recommendations })
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const body = await request.json()
    const { recommendationId, action, quantityOrdered } = body
    
    if (action === "order") {
      const result = await ReorderService.markOrdered(recommendationId, quantityOrdered)
      return NextResponse.json(result)
    } else if (action === "complete") {
      const result = await ReorderService.markCompleted(recommendationId)
      return NextResponse.json(result)
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Reorder action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}