// lib/services/forecasting.service.ts
import { PrismaClient, Prisma } from "@prisma/client"

const prisma = new PrismaClient()

interface ForecastResult {
  medicineId: string
  medicineName: string
  predictedDemand: number
  confidenceRange: { low: number; high: number }
  factors: {
    historicalAvg: number
    trend: number
    seasonality: number
    specialEvents: string[]
  }
  recommendation: string
}

export class ForecastingService {
  
  // Calculate daily average sales for a medicine
  static async calculateDailyAverage(pharmacyId: string, medicineId: string, days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const sales = await prisma.salesHistory.aggregate({
      where: {
        pharmacyId,
        medicineId,
        date: { gte: startDate }
      },
      _avg: { quantity: true },
      _count: true
    })
    
    return sales._avg.quantity || 0
  }
  
  // Detect sales trend (increasing/decreasing)
  static async detectTrend(pharmacyId: string, medicineId: string, weeks: number = 8) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (weeks * 7))
    
    const weeklySales = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('week', date) as week,
        SUM(quantity) as total_sales
      FROM SalesHistory
      WHERE pharmacyId = ${pharmacyId} 
        AND medicineId = ${medicineId}
        AND date >= ${startDate}
      GROUP BY DATE_TRUNC('week', date)
      ORDER BY week ASC
    `
    
    // Calculate trend using linear regression
    const sales = weeklySales as any[]
    if (sales.length < 2) return 0
    
    const n = sales.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = sales.map(s => Number(s.total_sales))
    
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    return slope // Positive = increasing, Negative = decreasing
  }
  
  // Get seasonal factors based on day of week and month
  static async getSeasonalFactors(pharmacyId: string, medicineId: string) {
    const sales = await prisma.salesHistory.findMany({
      where: {
        pharmacyId,
        medicineId,
        date: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
      },
      select: { quantity: true, dayOfWeek: true, date: true }
    })
    
    if (sales.length === 0) {
      return {
        weekdayFactor: new Array(7).fill(1),
        monthlyFactor: new Array(12).fill(1)
      }
    }
    
    // Calculate average by day of week
    const weekdayTotals = [0, 0, 0, 0, 0, 0, 0]
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]
    const monthlyTotals = new Array(12).fill(0)
    const monthlyCounts = new Array(12).fill(0)
    
    for (const sale of sales) {
      weekdayTotals[sale.dayOfWeek] += sale.quantity
      weekdayCounts[sale.dayOfWeek]++
      
      const month = sale.date.getMonth()
      monthlyTotals[month] += sale.quantity
      monthlyCounts[month]++
    }
    
    const overallAvg = sales.reduce((sum, s) => sum + s.quantity, 0) / sales.length
    
    const weekdayFactor = weekdayTotals.map((total, i) => 
      weekdayCounts[i] > 0 ? total / weekdayCounts[i] / overallAvg : 1
    )
    
    const monthlyFactor = monthlyTotals.map((total, i) => 
      monthlyCounts[i] > 0 ? total / monthlyCounts[i] / overallAvg : 1
    )
    
    return { weekdayFactor, monthlyFactor }
  }
  
  // Generate demand forecast
  static async generateForecast(
    pharmacyId: string, 
    medicineId: string,
    days: number = 7
  ): Promise<ForecastResult> {
    // Get medicine info
    const medicine = await prisma.medicine.findUnique({
      where: { id: medicineId },
      include: { inventory: { where: { pharmacyId } } }
    })
    
    if (!medicine) throw new Error("Medicine not found")
    
    // Calculate factors
    const historicalAvg = await this.calculateDailyAverage(pharmacyId, medicineId)
    const trend = await this.detectTrend(pharmacyId, medicineId)
    const seasonalFactors = await this.getSeasonalFactors(pharmacyId, medicineId)
    
    // Base prediction
    let predictedDemand = historicalAvg * days
    
    // Apply trend (assuming trend per week)
    predictedDemand += trend * (days / 7)
    
    // Apply seasonality for the upcoming period
    const upcomingDates = Array.from({ length: days }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() + i)
      return date
    })
    
    let seasonalityAdjustment = 0
    for (const date of upcomingDates) {
      const weekday = date.getDay()
      const month = date.getMonth()
      seasonalityAdjustment += (seasonalFactors.weekdayFactor[weekday] - 1) * (historicalAvg)
      seasonalityAdjustment += (seasonalFactors.monthlyFactor[month] - 1) * (historicalAvg)
    }
    
    predictedDemand += seasonalityAdjustment
    
    // Ensure non-negative
    predictedDemand = Math.max(0, Math.round(predictedDemand))
    
    // Calculate confidence interval (80% confidence)
    const historicalStdDev = await this.calculateStdDev(pharmacyId, medicineId)
    const marginOfError = 1.28 * (historicalStdDev / Math.sqrt(days))
    
    const confidenceLow = Math.max(0, Math.round(predictedDemand - marginOfError))
    const confidenceHigh = Math.round(predictedDemand + marginOfError)
    
    // Generate recommendation
    const currentStock = medicine.inventory[0]?.quantity || 0
    let recommendation = ""
    
    if (predictedDemand > currentStock) {
      recommendation = `Reorder soon. Current stock (${currentStock}) may not meet forecasted demand (${predictedDemand} units over ${days} days).`
    } else if (predictedDemand > currentStock * 0.7) {
      recommendation = `Monitor stock levels. Forecast suggests ${Math.round((predictedDemand / currentStock) * 100)}% of current stock may be consumed.`
    } else {
      recommendation = `Stock levels adequate. Forecast suggests sufficient inventory for the period.`
    }
    
    // Save forecast to database
    await prisma.demandForecast.create({
      data: {
        medicineId,
        pharmacyId,
        forecastPeriod: "DAILY",
        forecastDate: new Date(),
        predictedDemand,
        confidenceLow,
        confidenceHigh,
        historicalAvg,
        seasonalityFactor: 1,
        trendFactor: trend,
        specialEvents: Prisma.JsonNull,
      }
    })
    
    return {
      medicineId,
      medicineName: medicine.name,
      predictedDemand,
      confidenceRange: { low: confidenceLow, high: confidenceHigh },
      factors: {
        historicalAvg,
        trend,
        seasonality: 1,
        specialEvents: []
      },
      recommendation
    }
  }
  
  static async calculateStdDev(pharmacyId: string, medicineId: string): Promise<number> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    
    const sales = await prisma.salesHistory.findMany({
      where: {
        pharmacyId,
        medicineId,
        date: { gte: startDate }
      },
      select: { quantity: true }
    })
    
    if (sales.length === 0) return 0
    
    const quantities = sales.map(s => s.quantity)
    const mean = quantities.reduce((a, b) => a + b, 0) / quantities.length
    const variance = quantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / quantities.length
    
    return Math.sqrt(variance)
  }
  
  // Batch generate forecasts for all medicines
  static async generateBatchForecasts(pharmacyId: string) {
    const inventory = await prisma.inventoryItem.findMany({
      where: { pharmacyId },
      include: { medicine: true }
    })
    
    const forecasts = []
    for (const item of inventory) {
      try {
        const forecast = await this.generateForecast(pharmacyId, item.medicineId)
        forecasts.push(forecast)
      } catch (error) {
        console.error(`Failed to forecast for ${item.medicineId}:`, error)
      }
    }
    
    return forecasts
  }
}