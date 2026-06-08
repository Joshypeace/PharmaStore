// app/api/pharmacy/forecast/route.ts
import { NextRequest, NextResponse } from "next/server"
import { ForecastingService } from "@/lib/services/forecasting.service"
import { getServerSession } from "next-auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const pharmacyId = searchParams.get("pharmacyId")
    const medicineId = searchParams.get("medicineId")
    
    if (!pharmacyId) {
      return NextResponse.json({ error: "Pharmacy ID required" }, { status: 400 })
    }
    
    if (medicineId) {
      // Single medicine forecast
      const forecast = await ForecastingService.generateForecast(pharmacyId, medicineId)
      return NextResponse.json({ forecast })
    } else {
      // Batch forecast for all medicines
      const forecasts = await ForecastingService.generateBatchForecasts(pharmacyId)
      return NextResponse.json({ forecasts })
    }
  } catch (error) {
    console.error("Forecast error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}