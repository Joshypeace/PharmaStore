import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { items, total } = await request.json()
    
    // Get the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Process each item in the transaction
    for (const item of items) {
      // Update inventory
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          quantity: {
            decrement: item.quantity
          }
        }
      })

      // Record the sale - adjust fields based on your actual Prisma schema
      await prisma.sale.create({
        data: {
          itemId: item.id, // Changed to match Prisma schema
          quantity: item.quantity,
          totalPrice: item.total || item.price * item.quantity,
          userId: user.id,
        }
      })
    }

    // Create activity log
    await prisma.activityLog.create({
      data: {
        type: 'SALE',
        message: `Processed sale of ${items.length} items totaling MWK ${total}`,
        userId: user.id,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing sale:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sales = await prisma.sale.findMany({
      include: {
        item: true, 
        soldBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(sales)
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}