// lib/services/expiry-monitoring.service.ts
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export class ExpiryMonitoringService {
  
  // Scan all inventory for expiry tracking
  static async scanInventoryForExpiry(pharmacyId: string) {
    const inventory = await prisma.inventoryItem.findMany({
      where: {
        pharmacyId,
        expiryDate: { not: null }
      },
      include: {
        medicine: true,
        pharmacy: true
      }
    })
    
    const today = new Date()
    const results = []
    
    for (const item of inventory) {
      if (!item.expiryDate) continue
      
      const expiryDate = new Date(item.expiryDate)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
      
      let status = "ACTIVE"
      let severity = "INFO"
      
      if (daysUntilExpiry < 0) {
        status = "EXPIRED"
        severity = "CRITICAL"
      } else if (daysUntilExpiry <= 7) {
        status = "EXPIRING_CRITICAL"
        severity = "CRITICAL"
      } else if (daysUntilExpiry <= 30) {
        status = "EXPIRING_SOON"
        severity = "WARNING"
      }
      
      // Update or create expiry tracking record
      let expiryRecord = await prisma.expiryTracking.findFirst({
        where: {
          inventoryItemId: item.id
        }
      })

      if (expiryRecord) {
        expiryRecord = await prisma.expiryTracking.update({
          where: { id: expiryRecord.id },
          data: {
            expiryDate,
            remainingDays: daysUntilExpiry,
            status: status as any,
            quantity: item.quantity
          }
        })
      } else {
        expiryRecord = await prisma.expiryTracking.create({
          data: {
            inventoryItemId: item.id,
            pharmacyId,
            medicineId: item.medicineId,
            batchNumber: item.batch || "N/A",
            expiryDate,
            quantity: item.quantity,
            remainingDays: daysUntilExpiry,
            status: status as any
          }
        })
      }
      
      // Send alerts if needed
      await this.sendExpiryAlerts(expiryRecord, daysUntilExpiry, severity)
      
      results.push({
        medicine: item.medicine.name,
        batchNumber: item.batch,
        expiryDate,
        daysUntilExpiry,
        status,
        quantity: item.quantity
      })
    }
    
    return results
  }
  
  // Send expiry alerts
  static async sendExpiryAlerts(record: any, daysUntilExpiry: number, severity: string) {
    // Check for 30-day alert
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 7 && !record.alertSent30d) {
      await prisma.stockAlert.create({
        data: {
          pharmacyId: record.pharmacyId,
          medicineId: record.medicineId,
          alertType: "EXPIRY",
          severity: "WARNING",
          currentQuantity: record.quantity,
          threshold: 30,
          expiryDate: record.expiryDate,
          daysRemaining: daysUntilExpiry,
          message: `${record.medicine?.name || "Medicine"} expires in ${daysUntilExpiry} days. ${record.quantity} units will expire. Consider putting on discount.`,
        }
      })
      
      await prisma.expiryTracking.update({
        where: { id: record.id },
        data: { alertSent30d: true }
      })
    }
    
    // Check for 7-day alert
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0 && !record.alertSent7d) {
      await prisma.stockAlert.create({
        data: {
          pharmacyId: record.pharmacyId,
          medicineId: record.medicineId,
          alertType: "EXPIRY",
          severity: "CRITICAL",
          currentQuantity: record.quantity,
          threshold: 7,
          expiryDate: record.expiryDate,
          daysRemaining: daysUntilExpiry,
          message: `URGENT: ${record.medicine?.name || "Medicine"} expires in ${daysUntilExpiry} days! ${record.quantity} units must be sold or disposed.`,
        }
      })
      
      await prisma.expiryTracking.update({
        where: { id: record.id },
        data: { alertSent7d: true }
      })
    }
    
    // Check for expired
    if (daysUntilExpiry < 0 && !record.alertSentExpired) {
      await prisma.stockAlert.create({
        data: {
          pharmacyId: record.pharmacyId,
          medicineId: record.medicineId,
          alertType: "EXPIRY",
          severity: "CRITICAL",
          currentQuantity: record.quantity,
          threshold: 0,
          expiryDate: record.expiryDate,
          daysRemaining: daysUntilExpiry,
          message: `${record.medicine?.name || "Medicine"} has EXPIRED! ${record.quantity} units must be disposed immediately.`,
        }
      })
      
      await prisma.expiryTracking.update({
        where: { id: record.id },
        data: { alertSentExpired: true }
      })
    }
  }
  
  // Get expiring soon report
  static async getExpiringSoonReport(pharmacyId: string, days: number = 30) {
    const expiringItems = await prisma.expiryTracking.findMany({
      where: {
        pharmacyId,
        remainingDays: { lte: days, gt: 0 },
        status: { in: ["EXPIRING_SOON", "EXPIRING_CRITICAL"] }
      },
      include: {
        medicine: true,
        inventoryItem: true
      },
      orderBy: { remainingDays: 'asc' }
    })
    
    // Calculate potential loss
    const potentialLoss = expiringItems.reduce((sum, item) => {
      return sum + (item.inventoryItem.price * item.quantity)
    }, 0)
    
    // Group by urgency
    const critical = expiringItems.filter(i => i.remainingDays <= 7)
    const warning = expiringItems.filter(i => i.remainingDays > 7 && i.remainingDays <= 30)
    
    return {
      totalExpiringItems: expiringItems.length,
      criticalCount: critical.length,
      warningCount: warning.length,
      potentialLoss,
      items: expiringItems.map(item => ({
        name: item.medicine.name,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        price: item.inventoryItem.price,
        totalValue: item.inventoryItem.price * item.quantity,
        daysRemaining: item.remainingDays,
        status: item.status
      }))
    }
  }
  
  // Mark items as discounted
  static async markForDiscount(expiryId: string, discountPercent: number) {
    const expiryRecord = await prisma.expiryTracking.update({
      where: { id: expiryId },
      data: {
        discountedAt: new Date(),
        discountPercent
      }
    })
    
    return expiryRecord
  }
  
  // Dispose expired items
  static async disposeExpired(expiryId: string, reason: string) {
    const expiryRecord = await prisma.expiryTracking.findUnique({
      where: { id: expiryId },
      include: { inventoryItem: true }
    })
    
    if (!expiryRecord) throw new Error("Expiry record not found")
    
    // Remove from inventory
    await prisma.inventoryItem.update({
      where: { id: expiryRecord.inventoryItemId },
      data: { quantity: 0 }
    })
    
    // Update expiry tracking
    await prisma.expiryTracking.update({
      where: { id: expiryId },
      data: {
        status: "DISPOSED",
        disposedAt: new Date(),
        disposalReason: reason
      }
    })
    
    return { success: true, message: `Medicine disposed successfully` }
  }
}