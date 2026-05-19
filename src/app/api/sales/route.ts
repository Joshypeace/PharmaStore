import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma, prisma } from '@/lib/prisma'

// POST - Process a new sale
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // FIRST: Get the user with their pharmacy ID - CRITICAL for isolation
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        pharmacyId: true,
        name: true,
        pharmacy: {
          select: { id: true, name: true }
        }
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.pharmacyId) {
      return NextResponse.json({ error: 'No pharmacy associated with this user' }, { status: 400 })
    }

    const { items, total } = await request.json()

    if (!items || !items.length) {
      return NextResponse.json({ error: 'No items to process' }, { status: 400 })
    }

    console.log(`Processing sale for pharmacy: ${user.pharmacy?.name} (${user.pharmacyId})`)

    // Process each item in the transaction with ownership verification
    const processedItems = []
    
    for (const item of items) {
      // CRITICAL: Verify the inventory item belongs to this pharmacy
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: { 
          id: item.id,
          pharmacyId: user.pharmacyId  // ← Verify ownership
        },
        include: { medicine: true }
      })

      if (!inventoryItem) {
        throw new Error(`Item ${item.id} not found or does not belong to your pharmacy`)
      }

      if (inventoryItem.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${inventoryItem.medicine.name}. Available: ${inventoryItem.quantity}`)
      }

      // Update inventory (decrement quantity)
      const updatedItem = await prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          quantity: {
            decrement: item.quantity
          }
        },
        include: { medicine: true }
      })

      // Record the sale
      const sale = await prisma.sale.create({
        data: {
          itemId: item.id,
          quantity: item.quantity,
          totalPrice: item.total || item.price * item.quantity,
          userId: user.id,
        },
        include: {
          item: {
            include: { medicine: true }
          }
        }
      })

      processedItems.push({
        medicineName: updatedItem.medicine.name,
        quantity: item.quantity,
        price: item.price,
        remainingStock: updatedItem.quantity
      })
    }

    // Create activity log
    await prisma.activityLog.create({
      data: {
        type: 'SALE',
        message: `Processed sale of ${items.length} item(s) totaling MWK ${total.toLocaleString()}`,
        userId: user.id,
      }
    })

    return NextResponse.json({ 
      success: true,
      message: `Sale completed successfully`,
      items: processedItems,
      total: total,
      pharmacy: user.pharmacy?.name
    })
    
  } catch (error) {
    console.error('Error processing sale:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Fetch sales with pharmacy filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // FIRST: Get the user's pharmacy ID
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.pharmacyId) {
      return NextResponse.json({ error: 'No pharmacy associated with this user' }, { status: 400 })
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause with pharmacy filtering
    const whereClause: Prisma.SaleWhereInput = {
      item: {
        pharmacyId: user.pharmacyId  // ← CRITICAL: Filter by pharmacy through the item relation
      }
    }

    // Add date filter if provided
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate)
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.sale.count({
      where: whereClause
    })

    // Fetch sales with proper relations
    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        item: {
          include: {
            medicine: {
              select: {
                id: true,
                name: true
              }
            },
            pharmacy: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        soldBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Format the response
    const formattedSales = sales.map(sale => ({
      id: sale.id,
      date: sale.createdAt,
      medicineName: sale.item.medicine.name,
      quantity: sale.quantity,
      unitPrice: sale.item.price,
      totalPrice: sale.totalPrice,
      customer: 'Walk-in Customer', // You can add customer info if you have it
      soldBy: sale.soldBy.name,
      pharmacy: sale.item.pharmacy.name,
      status: 'Completed'
    }))

    // Calculate summary statistics for this pharmacy only
    const summary = await prisma.sale.aggregate({
      where: whereClause,
      _sum: {
        totalPrice: true,
        quantity: true
      },
      _count: {
        id: true
      }
    })

    // Get today's sales for this pharmacy
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todaySales = await prisma.sale.aggregate({
      where: {
        ...whereClause,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      _sum: {
        totalPrice: true
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedSales,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      summary: {
        totalSales: summary._count.id || 0,
        totalRevenue: summary._sum.totalPrice || 0,
        totalItemsSold: summary._sum.quantity || 0,
        todayRevenue: todaySales._sum.totalPrice || 0
      },
      pharmacy: {
        id: user.pharmacy?.id,
        name: user.pharmacy?.name
      }
    })
    
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales data' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel/delete a sale (with verification)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const saleId = searchParams.get('id')

    if (!saleId) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 })
    }

    // Get the user's pharmacy ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, pharmacyId: true }
    })

    if (!user?.pharmacyId) {
      return NextResponse.json({ error: 'No pharmacy associated' }, { status: 400 })
    }

    // Verify the sale belongs to this pharmacy
    const sale = await prisma.sale.findFirst({
  where: {
    id: saleId,
    item: {
      pharmacyId: user.pharmacyId
    }
  },
  include: {
    item: {
      include: {
        medicine: true
      }
    }
  }
})

    // Restore the inventory quantity
    await prisma.inventoryItem.update({
      where: { id: sale?.itemId },
      data: {
        quantity: {
          increment: sale?.quantity
        }
      }
    })

    // Delete the sale
    await prisma.sale.delete({
      where: { id: saleId }
    })

    // Log the cancellation
    await prisma.activityLog.create({
      data: {
        type: 'DELETE_STOCK',
        message: `Cancelled sale of ${sale?.quantity} units of ${sale?.item.medicine.name || 'medicine'}`,
        userId: user.id,
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Sale cancelled and inventory restored' 
    })
    
  } catch (error) {
    console.error('Error deleting sale:', error)
    return NextResponse.json(
      { error: 'Failed to delete sale' },
      { status: 500 }
    )
  }
}