import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, Prisma } from '@/lib/prisma'
import { TopDrugGroup, Sale } from '@/types/index'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    const whereClause: Prisma.SaleWhereInput = {
      userId: session.user.id,
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    // Get sales data
    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        item: true,
        soldBy: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get total revenue
    const totalRevenue = sales.reduce((sum: number, sale: Prisma.SaleGetPayload<Prisma.SaleFindManyArgs>) => sum + sale.totalPrice, 0)

    // Get sales by month
    const salesByMonth = await prisma.sale.groupBy({
      by: ['createdAt'],
      where: whereClause,
      _sum: {
        totalPrice: true,
        quantity: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Get top selling items
    const topSellingItems = await prisma.sale.groupBy({
      by: ['itemId'],
      where: whereClause,
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      _count: {
        itemId: true,
      },
      orderBy: {
        _sum: {
          totalPrice: 'desc',
        },
      },
      take: 10,
    })

    // Get items details for top selling items
    const topItemsWithDetails = await Promise.all(
      topSellingItems.map(async (item: TopDrugGroup) => {
        const itemDetails = await prisma.inventoryItem.findUnique({
          where: { id: item.itemId },
          include: {
            medicine: true,
          },
        })
        return {
          name: itemDetails?.medicine?.name || 'Unknown Item',
          quantity: item._sum.quantity || 0,
          revenue: item._sum.totalPrice || 0,
        }
      })
    )

    // Get staff performance
    const staffPerformance = await prisma.sale.groupBy({
      by: ['userId'],
      where: whereClause,
      _sum: {
        totalPrice: true,
        quantity: true,
      },
      _count: {
        id: true,
      },
    })

    // Get staff details
    const staffWithDetails = await Promise.all(
      staffPerformance.map(async (staff: { userId: string; _sum: { totalPrice: number | null; quantity: number | null }; _count: { id: number } }) => {
        const staffDetails = await prisma.user.findUnique({
          where: { id: staff.userId },
        })
        return {
          name: staffDetails?.name || 'Unknown Staff',
          sales: staff._count.id || 0,
          revenue: staff._sum.totalPrice || 0,
        }
      })
    )

    return NextResponse.json({
      totalRevenue,
      totalItemsSold: sales.reduce((sum: number, sale: Prisma.SaleGetPayload<Prisma.SaleFindManyArgs>) => sum + sale.quantity, 0),
      totalTransactions: sales.length,
      salesByMonth: salesByMonth.map((sale: { createdAt: Date; _sum: { totalPrice: number | null; quantity: number | null } }) => ({
        month: sale.createdAt.toLocaleString('default', { month: 'short' }),
        revenue: sale._sum.totalPrice || 0,
        items: sale._sum.quantity || 0,
      })),
      topSellingItems: topItemsWithDetails,
      staffPerformance: staffWithDetails,
    })
  } catch (error) {
    console.error('Error fetching sales report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales report' },
      { status: 500 }
    )
  }
}