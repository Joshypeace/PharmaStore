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
    const settings = await prisma.backupSettings.findFirst({
      where: { pharmacyId: session.user.pharmacyId! },
    })

    return NextResponse.json(settings || {
      backupFrequency: 'daily',
      automaticBackups: true,
      lastBackup: null,
    })
  } catch (error) {
    console.error('Error fetching backup settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch backup settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.pharmacyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { backupFrequency, automaticBackups } = body

    const settings = await prisma.backupSettings.upsert({
      where: { id: session.user.pharmacyId },
      update: {
        backupFrequency,
        automaticBackups,
      },
      create: {
        backupFrequency,
        automaticBackups,
        pharmacyId: session.user.pharmacyId,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'UPDATE_STOCK',
        message: 'Updated backup settings',
        userId: session.user.id,
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error saving backup settings:', error)
    return NextResponse.json(
      { error: 'Failed to save backup settings' },
      { status: 500 }
    )
  }
}

export async function PUT(_request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.pharmacyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Update last backup time
    const settings = await prisma.backupSettings.update({
      where: { id: session.user.pharmacyId },
      data: {
        lastBackup: new Date(),
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'UPDATE_STOCK',
        message: 'Created manual backup',
        userId: session.user.id,
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    )
  }
}
