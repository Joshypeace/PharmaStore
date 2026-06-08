// lib/services/reorder.service.ts
import { PrismaClient } from "@prisma/client"
import { ForecastingService } from "./forecasting.service"

const prisma = new PrismaClient()

export class ReorderService {
  
  // Generate reorder recommendations
  static async generateRecommendations(pharmacyId: string) {
    const inventory = await prisma.inventoryItem.findMany({
      where: { pharmacyId },
      include: { medicine: true }
    })
    
    const recommendations = []
    
    for (const item of inventory) {
      // Calculate daily average sales
      const dailyAvg = await ForecastingService.calculateDailyAverage(pharmacyId, item.medicineId)
      
      if (dailyAvg === 0) continue // No sales data, skip
      
      // Calculate days until stockout
      const daysUntilStockout = Math.floor(item.quantity / dailyAvg)
      
      // Determine reorder threshold (e.g., 7 days buffer)
      const reorderThreshold = 7 // days
      
      if (daysUntilStockout <= reorderThreshold) {
        // Calculate recommended reorder quantity
        const recommendedQty = Math.ceil(dailyAvg * 14) // 2 weeks supply
        const bufferStock = Math.ceil(dailyAvg * 3) // 3 days buffer
        
        // Determine priority
        let priority: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM"
        if (daysUntilStockout <= 3) priority = "HIGH"
        else if (daysUntilStockout <= 7) priority = "MEDIUM"
        else priority = "LOW"
        
        // Check if recommendation already exists
        const existing = await prisma.reorderRecommendation.findFirst({
          where: {
            pharmacyId,
            medicineId: item.medicineId,
            status: { in: ["PENDING", "ORDERED"] }
          }
        })
        
        if (!existing) {
          const recommendation = await prisma.reorderRecommendation.create({
            data: {
              pharmacyId,
              medicineId: item.medicineId,
              recommendedQuantity: recommendedQty,
              currentStock: item.quantity,
              dailyAverageSales: dailyAvg,
              daysUntilStockout,
              bufferStock,
              priority,
              status: "PENDING",
              notes: `Stock will last approximately ${daysUntilStockout} days at current sales rate.`
            }
          })
          
          recommendations.push({
            medicine: item.medicine.name,
            ...recommendation
          })
          
          // Create alert for critical stock
          if (priority === "HIGH") {
            await prisma.stockAlert.create({
              data: {
                pharmacyId,
                medicineId: item.medicineId,
                alertType: "LOW_STOCK",
                severity: "CRITICAL",
                currentQuantity: item.quantity,
                threshold: Math.ceil(dailyAvg * 3),
                message: `CRITICAL: ${item.medicine.name} has only ${item.quantity} units left (${daysUntilStockout} days supply). Reorder immediately!`,
              }
            })
          }
        }
      }
    }
    
    return recommendations
  }
  
  // Get reorder recommendations list
  static async getRecommendations(pharmacyId: string, status?: string) {
    const where: any = { pharmacyId }
    if (status) where.status = status
    
    const recommendations = await prisma.reorderRecommendation.findMany({
      where,
      include: { medicine: true },
      orderBy: [
        { priority: 'asc' },
        { daysUntilStockout: 'asc' }
      ]
    })
    
    return recommendations
  }
  
  // Mark recommendation as ordered
  static async markOrdered(recommendationId: string, quantityOrdered?: number) {
    const recommendation = await prisma.reorderRecommendation.update({
      where: { id: recommendationId },
      data: {
        status: "ORDERED",
        notes: `Order placed${quantityOrdered ? ` for ${quantityOrdered} units` : ""}`
      }
    })
    
    return recommendation
  }
  
  // Mark as completed (inventory received)
  static async markCompleted(recommendationId: string) {
    const recommendation = await prisma.reorderRecommendation.update({
      where: { id: recommendationId },
      data: { status: "COMPLETED" }
    })
    
    return recommendation
  }
}