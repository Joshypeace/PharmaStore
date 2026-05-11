import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { pharmacy: true }
    })

    if (!user?.pharmacyId) {
      return NextResponse.json({ error: 'No pharmacy associated' }, { status: 400 })
    }

    const orders = await prisma.medicineOrder.findMany({
      where: { pharmacyId: user.pharmacyId },
      include: {
        medicine: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}