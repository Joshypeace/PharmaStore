import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, Prisma } from '@/lib/prisma'
import { InventoryItem } from '@/src/types'



// GET all inventory items with optimized filtering
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const searchTerm = searchParams.get('search') || ''
  const category = searchParams.get('category') || 'all'

  try {
  
    const whereClause:Prisma.InventoryItemWhereInput = {}
    
    if (searchTerm) {
      whereClause.OR = [
        { medicine: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { category: { contains: searchTerm, mode: 'insensitive' } },
      ]
    }
    
    if (category !== 'all') {
      whereClause.category = category
    }

    // Select only needed fields to reduce data transfer
    const items = await prisma.inventoryItem.findMany({
      where: whereClause,
      select: {
        id: true,
        medicine: true,
        batch: true,
        quantity: true,
        expiryDate: true,
        category: true,
        price: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform data
    const transformed = items.map((item) => ({
      id: item.id,
      name: item.medicine.name,
      batch: item.batch || item.id.slice(0, 6).toUpperCase(),
      quantity: item.quantity,
      expiry: item.expiryDate?.toISOString().split('T')[0] || 'N/A',
      category: item.category,
      price: item.price,
      status: getItemStatus(item.quantity, item.expiryDate),
    }))

    const response = NextResponse.json(transformed)
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=30')
    return response
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

// POST add new inventory item
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  try {
    const newItem = await prisma.inventoryItem.create({
      data: {
        medicine: body.name,
        batch: body.batch || null,
        category: body.category,
        quantity: Number(body.quantity),
        price: Number(body.price) || 0,
        expiryDate: body.expiry ? new Date(body.expiry) : null,
        pharmacy: { connect: { id: session.user.pharmacyId } },
      },
    })

    // Log activity with MWK
    await prisma.activityLog.create({
      data: {
        type: 'ADD_STOCK',
        message: `Added ${body.quantity} units of ${body.name} at MWK ${body.price} each`,
        userId: session.user.id,
      },
    })

    return NextResponse.json(newItem, { status: 201 })
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    )
  }
}

// Helper: compute item status
function getItemStatus(quantity: number, expiryDate: Date | null): string {
  if (quantity === 0) return 'Out of Stock'
  if (quantity < 10) return 'Low Stock'

  if (expiryDate) {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 30) return 'Expires Soon'
  }

  return 'In Stock'
}