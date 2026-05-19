import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, Prisma } from '@/lib/prisma'
import { InventoryItem } from '@/src/types'

// GET all inventory items with pharmacy filtering
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // FIRST: Get the user's pharmacy ID - CRITICAL for isolation
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { 
      id: true,
      pharmacyId: true,
      pharmacy: { select: { name: true } }
    }
  })

  if (!user?.pharmacyId) {
    return NextResponse.json({ error: 'No pharmacy associated with this user' }, { status: 400 })
  }

  console.log(`Inventory request for pharmacy: ${user.pharmacy?.name} (${user.pharmacyId})`)

  const { searchParams } = new URL(request.url)
  const searchTerm = searchParams.get('search') || ''
  const category = searchParams.get('category') || 'all'

  try {
    const whereClause: Prisma.InventoryItemWhereInput = {
      pharmacyId: user.pharmacyId  // ← CRITICAL: Filter by pharmacy
    }
    
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
        medicine: {
          select: {
            id: true,
            name: true
          }
        },
        batch: true,
        quantity: true,
        expiryDate: true,
        category: true,
        price: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform data
    const transformed = items.map((item) => ({
      id: item.id,
      name: item.medicine.name,
      medicineId: item.medicine.id,
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
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // FIRST: Get the user's pharmacy ID
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { 
      id: true,
      pharmacyId: true,
      pharmacy: { select: { name: true } }
    }
  })

  if (!user?.pharmacyId) {
    return NextResponse.json({ error: 'No pharmacy associated with this user' }, { status: 400 })
  }

  const body = await request.json()

  // Validate required fields
  if (!body.name || !body.category || !body.quantity) {
    return NextResponse.json({ error: 'Missing required fields: name, category, quantity' }, { status: 400 })
  }

  try {
    // Find or create the medicine
    let medicine = await prisma.medicine.findFirst({
      where: {
        name: {
          equals: body.name,
          mode: 'insensitive'
        }
      }
    })

    if (!medicine) {
      medicine = await prisma.medicine.create({
        data: { name: body.name }
      })
      console.log(`Created new medicine: ${body.name}`)
    }

    // Check if inventory already exists for this pharmacy and medicine
    const existingInventory = await prisma.inventoryItem.findFirst({
      where: {
        medicineId: medicine.id,
        pharmacyId: user.pharmacyId
      }
    })

    let newItem

    if (existingInventory) {
      // Update existing inventory
      newItem = await prisma.inventoryItem.update({
        where: { id: existingInventory.id },
        data: {
          quantity: existingInventory.quantity + Number(body.quantity),
          price: Number(body.price) || existingInventory.price,
          category: body.category,
          batch: body.batch || existingInventory.batch,
          expiryDate: body.expiry ? new Date(body.expiry) : existingInventory.expiryDate
        },
        include: {
          medicine: true,
          pharmacy: true
        }
      })
      console.log(`Updated existing inventory for ${body.name}: +${body.quantity} units`)
    } else {
      // Create new inventory item for this pharmacy ONLY
      newItem = await prisma.inventoryItem.create({
        data: {
          medicineId: medicine.id,
          pharmacyId: user.pharmacyId,  // ← CRITICAL: Link to specific pharmacy
          batch: body.batch || null,
          category: body.category,
          quantity: Number(body.quantity),
          price: Number(body.price) || 0,
          expiryDate: body.expiry ? new Date(body.expiry) : null,
        },
        include: {
          medicine: true,
          pharmacy: true
        }
      })
      console.log(`Created new inventory for ${body.name}: ${body.quantity} units for pharmacy ${user.pharmacy?.name}`)
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'ADD_STOCK',
        message: `Added ${body.quantity} units of ${body.name} at MWK ${body.price} each`,
        userId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      item: {
        id: newItem.id,
        name: newItem.medicine.name,
        quantity: newItem.quantity,
        price: newItem.price,
        category: newItem.category,
        batch: newItem.batch,
        expiryDate: newItem.expiryDate
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    )
  }
}

// DELETE inventory item with ownership verification
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // FIRST: Get the user's pharmacy ID
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { 
      id: true,
      pharmacyId: true 
    }
  })

  if (!user?.pharmacyId) {
    return NextResponse.json({ error: 'No pharmacy associated with this user' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
  }

  try {
    // Verify the item belongs to this pharmacy - CRITICAL for security
    const existingItem = await prisma.inventoryItem.findFirst({
      where: { 
        id: id,
        pharmacyId: user.pharmacyId  // ← CRITICAL: Verify ownership
      },
      include: { 
        medicine: true,
        pharmacy: true
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 })
    }

    // Delete the item
    await prisma.inventoryItem.delete({
      where: { id: id },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'DELETE_STOCK',
        message: `Deleted inventory item: ${existingItem.medicine.name} (${existingItem.quantity} units) from ${existingItem.pharmacy.name}`,
        userId: user.id,
      },
    })

    console.log(`Deleted inventory item ${id} from pharmacy ${user.pharmacyId}`)

    return NextResponse.json({ 
      success: true,
      message: 'Item deleted successfully' 
    })
    
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    )
  }
}

// PATCH update inventory item
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // FIRST: Get the user's pharmacy ID
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { 
      id: true,
      pharmacyId: true 
    }
  })

  if (!user?.pharmacyId) {
    return NextResponse.json({ error: 'No pharmacy associated with this user' }, { status: 400 })
  }

  const body = await request.json()
  const { id, quantity, price, category, batch, expiryDate } = body

  if (!id) {
    return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
  }

  try {
    // Verify the item belongs to this pharmacy
    const existingItem = await prisma.inventoryItem.findFirst({
      where: { 
        id: id,
        pharmacyId: user.pharmacyId  // ← CRITICAL: Verify ownership
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 })
    }

    // Update the item
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: id },
      data: {
        quantity: quantity !== undefined ? Number(quantity) : undefined,
        price: price !== undefined ? Number(price) : undefined,
        category: category || undefined,
        batch: batch || undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      },
      include: {
        medicine: true
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'UPDATE_STOCK',
        message: `Updated inventory: ${updatedItem.medicine.name} - new quantity: ${updatedItem.quantity}`,
        userId: user.id,
      },
    })

    return NextResponse.json({ 
      success: true,
      item: updatedItem 
    })
    
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
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