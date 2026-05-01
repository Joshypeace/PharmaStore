import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Extend the session user type to include pharmacyId
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      pharmacyId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const settings = await prisma.securitySettings.findFirst({
      where: { pharmacyId: session.user.pharmacyId! },
    })

    return NextResponse.json(settings || {
      sessionTimeout: 30,
      passwordPolicy: 'medium',
      twoFactorAuth: false,
      auditLogging: true,
      ipRestrictions: false,
    })
  } catch (error) {
    console.error('Error fetching security settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security settings' },
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
    const { sessionTimeout, passwordPolicy, twoFactorAuth, auditLogging, ipRestrictions } = body

    // Find existing security settings by pharmacyId
    const existingSettings = await prisma.securitySettings.findFirst({
      where: { pharmacyId: session.user.pharmacyId },
    });

    const settings = await prisma.securitySettings.upsert({
      where: existingSettings ? { id: existingSettings.id } : { id: '' }, // id is required
      update: {
        sessionTimeout: parseInt(sessionTimeout),
        passwordPolicy,
        twoFactorAuth,
        auditLogging,
        ipRestrictions,
      },
      create: {
        sessionTimeout: parseInt(sessionTimeout),
        passwordPolicy,
        twoFactorAuth,
        auditLogging,
        ipRestrictions,
        pharmacyId: session.user.pharmacyId,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'UPDATE_STOCK',
        message: 'Updated security settings',
        userId: session.user.id,
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error saving security settings:', error)
    return NextResponse.json(
      { error: 'Failed to save security settings' },
      { status: 500 }
    )
  }
}