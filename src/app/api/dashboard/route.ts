// app/api/dashboard/route.ts
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
    // Get date ranges
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Get sales data
    const todaySales = await prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        soldBy: {
          email: session.user.email
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
        soldBy: {
          email: session.user.email
        }
      },
      _sum: {
        totalPrice: true
      }
    })

    // Get inventory data
    const lowStockItems = await prisma.inventoryItem.count({
      where: {
        quantity: {
          lt: 10
        }
      }
    })

    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const expiringSoonItems = await prisma.inventoryItem.count({
      where: {
        expiryDate: {
          lte: thirtyDaysFromNow,
          gte: new Date()
        }
      }
    })

    // Get weekly sales (last 7 days)
    const weeklySalesData = await prisma.sale.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        soldBy: {
          email: session.user.email
        }
      },
      _sum: {
        totalPrice: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Format weekly sales data
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weeklySales = days.map(day => ({
      name: day,
      sales: 0
    }))

    

    weeklySalesData.forEach((sale:WeeklySale ) => {
      const dayIndex = sale.createdAt.getDay()
      weeklySales[dayIndex].sales += sale._sum.totalPrice || 0
    })

    // Get stock distribution
    const stockDistributionData = await prisma.inventoryItem.groupBy({
      by: ['category'],
      _sum: {
        quantity: true
      }
    })

    const stockDistribution = stockDistributionData.map((item: StockDistributionItem) => ({
      name: item.category,
      value: item._sum.quantity || 0,
      color: getCategoryColor(item.category)
    }))

    // Get top selling drugs
    const topDrugs = await prisma.sale.groupBy({
      by: ['itemId'],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        soldBy: {
          email: session.user.email
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

    // Get item details for top drugs
    const topDrugsWithDetails = await Promise.all(
      topDrugs.map(async (sale: TopDrugGroup) => {
        const item = await prisma.inventoryItem.findUnique({
          where: { id: sale.itemId }
        })
        return {
          name: item?.medicineId || 'Unknown',
          quantity: `${sale._sum.quantity} ${item?.medicineId?.includes('tablet') ? 'tablets' : 'units'}`,
          trend: '+0%'
        }
      })
    )

    // Get stock alerts - explicitly type the result
    const stockAlertsRaw = await prisma.inventoryItem.findMany({
      where: {
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
      take: 4
    })

    // Map database fields to InventoryItem type
    const stockAlerts: InventoryItem[] = stockAlertsRaw.map(item => ({
      id: item.id,
      medicine: item.medicineId,
      batch: item.batch,
      price: item.price,
      quantity: item.quantity,
      expiryDate: item.expiryDate,
      category: item.category
    }))

    // Explicitly type the formattedAlerts mapping
    const formattedAlerts = stockAlerts.map((item: InventoryItem) => ({
      name: item.medicine,
      status: item.quantity < 5 ? 'Low Stock' : 'Expires Soon',
      level: item.quantity < 5 
        ? `${item.quantity} remaining` 
        : `Exp: ${item.expiryDate?.toLocaleDateString() || 'Unknown'}`,
      type: item.quantity < 3 ? 'danger' : 'warning'
    }))

    // Get active users
    const activeUsers = await prisma.user.count()

    return NextResponse.json({
      todaySales: todaySales._sum.totalPrice || 0,
      yesterdaySales: yesterdaySales._sum.totalPrice || 0,
      lowStockItems,
      expiringSoonItems,
      activeUsers,
      weeklySales,
      stockDistribution,
      topDrugs: topDrugsWithDetails,
      stockAlerts: formattedAlerts
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