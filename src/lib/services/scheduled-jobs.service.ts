// lib/services/scheduled-jobs.service.ts
import { ForecastingService } from "./forecasting.service"
import { ExpiryMonitoringService } from "./expiry-monitoring.service"
import { ReorderService } from "./reorder.service"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export class ScheduledJobsService {
  
  // Run daily at midnight
  static async dailyInventoryScan() {
    console.log("Running daily inventory scan...")
    
    const pharmacies = await prisma.pharmacy.findMany()
    
    for (const pharmacy of pharmacies) {
      // Scan for expiring items
      await ExpiryMonitoringService.scanInventoryForExpiry(pharmacy.id)
      
      // Generate reorder recommendations
      await ReorderService.generateRecommendations(pharmacy.id)
      
      // Generate forecasts for top-selling items
      const topItems = await prisma.salesHistory.groupBy({
        by: ['medicineId'],
        where: {
          pharmacyId: pharmacy.id,
          date: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 20
      })
      
      for (const item of topItems) {
        await ForecastingService.generateForecast(pharmacy.id, item.medicineId)
      }
    }
    
    console.log("Daily scan completed")
  }
  
  // Run every hour to check for expiring reservations
  static async hourlyReservationCheck() {
    const expiredOrders = await prisma.publicOrder.updateMany({
      where: {
        status: { in: ["CONFIRMED", "READY_FOR_COLLECTION"] },
        reservationExpiry: { lt: new Date() }
      },
      data: { status: "EXPIRED" }
    })
    
    if (expiredOrders.count > 0) {
      console.log(`Marked ${expiredOrders.count} orders as expired`)
    }
  }
}
