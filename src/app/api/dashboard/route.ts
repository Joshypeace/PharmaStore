import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WeeklySale, StockDistributionItem, TopDrugGroup, InventoryItem } from "@/types/index";

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // FIRST: Get the user's pharmacy ID - CRITICAL for isolation
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        pharmacyId: true,
        pharmacy: {
          select: { id: true, name: true }
        }
      }
    })

    if (!user?.pharmacyId) {
      return NextResponse.json({ 
        error: 'No pharmacy associated with this user' 
      }, { status: 400 })
    }

    console.log(`Dashboard request for pharmacy: ${user.pharmacy?.name} (${user.pharmacyId})`)

    // Get date ranges
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Get sales data - FILTER BY PHARMACY ID through inventory items
    const todaySales = await prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        item: {
          pharmacyId: user.pharmacyId  // ← CRITICAL: Filter by pharmacy
        }
      },
      _sum: {
        totalPrice: true
      }
    })

    const yesterdaySales = await prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today
        },
        item: {
          pharmacyId: user.pharmacyId  // ← CRITICAL: Filter by pharmacy
        }
      },
      _sum: {
        totalPrice: true
      }
    })

    // Get inventory data - FILTER BY PHARMACY ID
    const lowStockItems = await prisma.inventoryItem.count({
      where: {
        pharmacyId: user.pharmacyId,  // ← CRITICAL: Filter by pharmacy
        quantity: {
          lt: 10
        }
      }
    })

    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const expiringSoonItems = await prisma.inventoryItem.count({
      where: {
        pharmacyId: user.pharmacyId,  // ← CRITICAL: Filter by pharmacy
        expiryDate: {
          lte: thirtyDaysFromNow,
          gte: new Date()
        }
      }
    })

    // Get weekly sales (last 7 days) - FILTER BY PHARMACY ID
    const weeklySalesData = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        item: {
          pharmacyId: user.pharmacyId  // ← CRITICAL: Filter by pharmacy
        }
      },
      select: {
        createdAt: true,
        totalPrice: true
      }
    })

    // Format weekly sales data
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weeklySales = days.map(day => ({
      name: day,
      sales: 0
    }))

    weeklySalesData.forEach((sale) => {
      const dayIndex = new Date(sale.createdAt).getDay()
      weeklySales[dayIndex].sales += sale.totalPrice || 0
    })

    // Get stock distribution - FILTER BY PHARMACY ID
    const stockDistributionData = await prisma.inventoryItem.groupBy({
      by: ['category'],
      where: {
        pharmacyId: user.pharmacyId  // ← CRITICAL: Filter by pharmacy
      },
      _sum: {
        quantity: true
      }
    })

    const stockDistribution = stockDistributionData.map((item) => ({
      name: item.category,
      value: item._sum.quantity || 0,
      color: getCategoryColor(item.category)
    }))

    // Get top selling drugs - FILTER BY PHARMACY ID
    const topDrugs = await prisma.sale.groupBy({
      by: ['itemId'],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        item: {
          pharmacyId: user.pharmacyId  // ← CRITICAL: Filter by pharmacy
        }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 4
    })

    // Get item details for top drugs - SAFE lookups with pharmacy check
    const topDrugsWithDetails = await Promise.all(
      topDrugs.map(async (sale) => {
        const item = await prisma.inventoryItem.findFirst({
          where: { 
            id: sale.itemId,
            pharmacyId: user.pharmacyId!  // ← CRITICAL: Verify ownership
          },
          select: {
            medicineId: true
          }
        })

        const medicine = item
          ? await prisma.medicine.findUnique({
              where: { id: item.medicineId },
              select: { name: true }
            })
          : null

        return {
          name: medicine?.name || 'Unknown Medicine',
          quantity: `${sale._sum.quantity} units`,
          trend: '+0%'
        }
      })
    )

    // Get stock alerts - FILTER BY PHARMACY ID
    const stockAlertsRaw = await prisma.inventoryItem.findMany({
      where: {
        pharmacyId: user.pharmacyId,  // ← CRITICAL: Filter by pharmacy
        OR: [
          { quantity: { lt: 5 } },
          { 
            expiryDate: {
              lte: thirtyDaysFromNow,
              gte: new Date()
            }
          }
        ]
      },
      select: {
        quantity: true,
        expiryDate: true,
        medicineId: true
      },
      take: 4
    })

    const medicineIds = Array.from(new Set(stockAlertsRaw.map((item) => item.medicineId)))
    const medicines = await prisma.medicine.findMany({
      where: {
        id: { in: medicineIds }
      },
      select: {
        id: true,
        name: true
      }
    })
    const medicineMap = Object.fromEntries(medicines.map((med) => [med.id, med.name]))

    // Format stock alerts
    const formattedAlerts = stockAlertsRaw.map((item) => ({
      name: medicineMap[item.medicineId],
      status: item.quantity < 5 ? 'Low Stock' : 'Expires Soon',
      level: item.quantity < 5 
        ? `${item.quantity} remaining` 
        : `Exp: ${item.expiryDate?.toLocaleDateString() || 'Unknown'}`,
      type: item.quantity < 3 ? 'danger' : 'warning'
    }))

    // Get active users for this pharmacy only
    const activeUsers = await prisma.user.count({
      where: {
        pharmacyId: user.pharmacyId  // ← CRITICAL: Filter by pharmacy
      }
    })

    return NextResponse.json({
      todaySales: todaySales._sum.totalPrice || 0,
      yesterdaySales: yesterdaySales._sum.totalPrice || 0,
      lowStockItems,
      expiringSoonItems,
      activeUsers,
      weeklySales,
      stockDistribution,
      topDrugs: topDrugsWithDetails,
      stockAlerts: formattedAlerts,
      pharmacy: {
        id: user.pharmacy?.id,
        name: user.pharmacy?.name
      }
    })

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Antibiotics': '#10B981',
    'Pain Relief': '#3B82F6',
    'Vitamins': '#F59E0B',
    'Other': '#EF4444'
  }
  return colors[category] || '#8884d8'
}