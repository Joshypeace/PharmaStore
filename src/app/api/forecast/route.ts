// app/api/forecast/route.ts
import { NextRequest, NextResponse } from "next/server"
import { ForecastingService } from "@/lib/services/forecasting.service"
import { getServerSession } from "next-auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pharmacyId = searchParams.get("pharmacyId")
    const medicineId = searchParams.get("medicineId")
    
    if (!pharmacyId) {
      return NextResponse.json({ error: "Pharmacy ID required" }, { status: 400 })
    }
    
    // Get the user's pharmacy to verify access
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { pharmacyId: true }
    })
    
    if (user?.pharmacyId !== pharmacyId) {
      return NextResponse.json({ error: "Unauthorized access to pharmacy" }, { status: 403 })
    }
    
    if (medicineId) {
      // Single medicine forecast
      try {
        const forecast = await ForecastingService.generateForecast(pharmacyId, medicineId)
        return NextResponse.json({ forecast })
      } catch (error) {
        console.error("Error generating forecast:", error)
        return NextResponse.json({ 
          error: "Failed to generate forecast",
          forecasts: [] 
        }, { status: 200 })
      }
    } else {
      // Batch forecast for all medicines
      try {
        const forecasts = await ForecastingService.generateBatchForecasts(pharmacyId)
        return NextResponse.json({ forecasts })
      } catch (error) {
        console.error("Error generating batch forecasts:", error)
        // Return empty array instead of error
        return NextResponse.json({ forecasts: [] })
      }
    }
  } catch (error) {
    console.error("Forecast error:", error)
    return NextResponse.json({ forecasts: [] })
  }
}