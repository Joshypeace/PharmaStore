// lib/services/forecasting.service.ts
import { PrismaClient, Prisma } from "@prisma/client"

const prisma = new PrismaClient()

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
  
  // Detect sales trend (increasing/decreasing) - Fixed case sensitivity
  static async detectTrend(pharmacyId: string, medicineId: string, weeks: number = 8) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (weeks * 7))
    
    // Use Prisma's built-in methods instead of raw SQL to avoid case sensitivity
    const weeklySales = await prisma.salesHistory.findMany({
      where: {
        pharmacyId,
        medicineId,
        date: { gte: startDate }
      },
      select: {
        date: true,
        quantity: true
      },
      orderBy: { date: 'asc' }
    })
    
    if (weeklySales.length < 2) return 0
    
    // Group by week
    const weeklyMap = new Map()
    weeklySales.forEach(sale => {
      const weekStart = new Date(sale.date)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekKey = weekStart.toISOString()
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + sale.quantity)
    })
    
    const weeklyTotals = Array.from(weeklyMap.values())
    if (weeklyTotals.length < 2) return 0
    
    // Calculate trend using linear regression
    const n = weeklyTotals.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = weeklyTotals
    
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    // Return as percentage of average
    const avg = sumY / n
    return avg > 0 ? (slope / avg) * 100 : 0
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
    
    if (sales.length === 0) return { weekdayFactor: Array(7).fill(1), monthlyFactor: Array(12).fill(1) }
    
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
  static async generateForecast(pharmacyId: string, medicineId: string, days: number = 7) {
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
    
    // Ensure non-negative
    predictedDemand = Math.max(0, Math.round(predictedDemand))
    
    // If no historical data, use a default
    if (historicalAvg === 0) {
      predictedDemand = 10 // Default prediction
    }
    
    // Calculate confidence interval (80% confidence)
    const historicalStdDev = await this.calculateStdDev(pharmacyId, medicineId)
    const marginOfError = 1.28 * (historicalStdDev / Math.sqrt(Math.max(days, 1)))
    
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
        specialEvents: [],
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