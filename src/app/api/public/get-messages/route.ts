import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const pharmacyId = searchParams.get('pharmacyId')
    
    if (!pharmacyId) {
      return NextResponse.json({ error: 'Pharmacy ID required' }, { status: 400 })
    }
    
    const orders = await prisma.medicineOrder.findMany({
      where: {
        pharmacyId,
        notes: { not: null }
      },
      include: {
        messages: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    const messages = orders.flatMap(order => 
      order.messages.map(msg => ({
        ...msg,
        isFromPharmacy: !msg.isFromCustomer
      }))
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}