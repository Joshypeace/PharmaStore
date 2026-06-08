// app/api/pharmacy/expiry/route.ts
import { NextRequest, NextResponse } from "next/server"
import { ExpiryMonitoringService } from "@/lib/services/expiry-monitoring.service"
import { getServerSession } from "next-auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const pharmacyId = searchParams.get("pharmacyId")
    const scan = searchParams.get("scan") === "true"
    
    if (!pharmacyId) {
      return NextResponse.json({ error: "Pharmacy ID required" }, { status: 400 })
    }
    
    if (scan) {
      // Force scan inventory
      const results = await ExpiryMonitoringService.scanInventoryForExpiry(pharmacyId)
      return NextResponse.json({ message: "Scan complete", results })
    } else {
      // Get expiring soon report
      const report = await ExpiryMonitoringService.getExpiringSoonReport(pharmacyId)
      return NextResponse.json(report)
    }
  } catch (error) {
    console.error("Expiry monitoring error:", error)
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
    const { action, expiryId, discountPercent, reason } = body
    
    if (action === "discount") {
      const result = await ExpiryMonitoringService.markForDiscount(expiryId, discountPercent)
      return NextResponse.json(result)
    } else if (action === "dispose") {
      const result = await ExpiryMonitoringService.disposeExpired(expiryId, reason)
      return NextResponse.json(result)
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Expiry action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}