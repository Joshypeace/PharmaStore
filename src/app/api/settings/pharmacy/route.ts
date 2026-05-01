import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const settings = await prisma.pharmacySettings.findFirst({
      where: { pharmacyId: (session.user as { pharmacyId?: string }).pharmacyId },
    })

    return NextResponse.json(settings || {
      name: '',
      licenseNumber: '',
      phone: '',
      email: '',
      address: '',
    })
  } catch (error) {
    console.error('Error fetching pharmacy settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pharmacy settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (
    !session ||
    !(session.user as { pharmacyId?: string }).pharmacyId
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, licenseNumber, phone, email, address } = body
    const pharmacyId = (session.user as { pharmacyId?: string }).pharmacyId
    if (!pharmacyId) {
      return NextResponse.json({ error: 'Pharmacy ID is required' }, { status: 400 })
    }

    // First, try to find existing settings by pharmacyId
    const existingSettings = await prisma.pharmacySettings.findFirst({
      where: { pharmacyId },
    })

    const settings = await prisma.pharmacySettings.upsert({
      where: { id: existingSettings?.id ?? '' }, // Prisma will throw if id is empty, so handle accordingly
      update: {
        name,
        licenseNumber,
        phone,
        email,
        address,
      },
      create: {
        name,
        licenseNumber,
        phone,
        email,
        address,
        pharmacyId,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'UPDATE_STOCK',
        message: 'Updated pharmacy information settings',
        userId: session.user.id,
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error saving pharmacy settings:', error)
    return NextResponse.json(
      { error: 'Failed to save pharmacy settings' },
      { status: 500 }
    )
  }
}