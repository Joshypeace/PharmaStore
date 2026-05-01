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
    const settings = await prisma.alertSettings.findFirst({
      where: { pharmacyId: (session.user as typeof session.user & { pharmacyId: string }).pharmacyId! },
    })

    return NextResponse.json(settings || {
      lowStockThreshold: 10,
      expiryAlertDays: 30,
      emailNotifications: true,
      smsNotifications: false,
      dailyReports: true,
    })
  } catch (error) {
    console.error('Error fetching alert settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alert settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (
    !session ||
    !(session.user as typeof session.user & { pharmacyId: string }).pharmacyId
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userWithPharmacy = session.user as typeof session.user & { pharmacyId: string }
    const body = await request.json();
    const {
      lowStockThreshold,
      expiryAlertDays,
      emailNotifications,
      smsNotifications,
      dailyReports
    } = body;

    // First, try to find existing settings by pharmacyId
    const existingSettings = await prisma.alertSettings.findFirst({
      where: { pharmacyId: userWithPharmacy.pharmacyId },
    });

    const settings = await prisma.alertSettings.upsert({
      where: { id: existingSettings?.id ?? '' }, // Prisma will throw if id is empty and no record exists, but upsert requires a unique field
      update: {
        lowStockThreshold: parseInt(lowStockThreshold),
        expiryAlertDays: parseInt(expiryAlertDays),
        emailNotifications,
        smsNotifications,
        dailyReports,
      },
      create: {
        lowStockThreshold: parseInt(lowStockThreshold),
        expiryAlertDays: parseInt(expiryAlertDays),
        emailNotifications,
        smsNotifications,
        dailyReports,
        pharmacyId: userWithPharmacy.pharmacyId,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'UPDATE_STOCK',
        message: 'Updated alert settings',
        userId: session.user.id,
      },
    });

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error saving alert settings:', error)
    return NextResponse.json(
      { error: 'Failed to save alert settings' },
      { status: 500 }
    )
  }
}