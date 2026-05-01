import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, Prisma } from '@/lib/prisma'
import { Sale, Expense } from '@/src/types'

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
      },
    })

    // Get expenses
    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
        date: startDate && endDate ? {
          gte: new Date(startDate),
          lte: new Date(endDate),
        } : undefined,
      },
    })

    // Calculate totals
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0)
    const totalCOGS = sales.reduce((sum, sale) => sum + (sale.item.price * sale.quantity), 0)
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const grossProfit = totalRevenue - totalCOGS
    const netProfit = grossProfit - totalExpenses

    // Group expenses by category
    const expensesByCategory = expenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0
      }
      acc[expense.category] += expense.amount
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      revenue: {
        totalSales: totalRevenue,
        prescriptionSales: sales.filter((s) => s.prescriptionId).reduce((sum, sale) => sum + sale.totalPrice, 0),
        otcSales: sales.filter((s) => !s.prescriptionId).reduce((sum, sale) => sum + sale.totalPrice, 0),
      },
      costOfGoodsSold: {
        medicationCosts: totalCOGS,
        totalCOGS: totalCOGS,
      },
      operatingExpenses: {
        totalOperatingExpenses: totalExpenses,
        byCategory: expensesByCategory,
      },
      calculations: {
        grossProfit,
        netProfit,
        grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      },
    })
  } catch (error) {
    console.error('Error fetching profit/loss report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profit/loss report' },
      { status: 500 }
    )
  }
}