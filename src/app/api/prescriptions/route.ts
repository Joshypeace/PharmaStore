import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, Prisma, PrescriptionStatus } from '@/lib/prisma'

// GET all prescriptions with filtering
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const searchTerm = searchParams.get('search') || ''
  const status = searchParams.get('status') || 'all'

  try {
    const whereClause: Prisma.PrescriptionWhereInput = {
      status: PrescriptionStatus.COMPLETED,
      userId: session.user.id,
    }

    if (searchTerm) {
      whereClause.OR = [
        { patientName: { contains: searchTerm, mode: 'insensitive' } },
        { doctor: { contains: searchTerm, mode: 'insensitive' } },
      ]
    }

    if (status !== 'all') {
      whereClause.status = status as PrescriptionStatus
    }

    const prescriptions = await prisma.prescription.findMany({
      where: whereClause,
      select: {
        id: true,
        patientName: true,
        age: true,
        gender: true,
        doctor: true,
        date: true,
        status: true,
        medications: true,
        imageUrl: true,
        createdAt: true,
      },
      orderBy: { date: 'desc' },
    })

    const response = NextResponse.json(prescriptions)
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=30')
    return response
  } catch (error) {
    console.error('Error fetching prescriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prescriptions' },
      { status: 500 }
    )
  }
}

// POST add new prescription
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const newPrescription = await prisma.prescription.create({
      data: {
        patientName: body.patientName,
        age: Number(body.age),
        gender: body.gender,
        doctor: body.doctor,
        medications: body.medications,
        imageUrl: body.imageUrl || null,
        status: 'PENDING',
        userId: session.user.id,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'ADD_STOCK',
        message: `Added prescription for ${body.patientName} by Dr. ${body.doctor}`,
        userId: session.user.id,
      },
    })

    return NextResponse.json(newPrescription, { status: 201 })
  } catch (error) {
    console.error('Error creating prescription:', error)
    return NextResponse.json(
      { error: 'Failed to create prescription' },
      { status: 500 }
    )
  }
}

// PATCH update prescription status
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, status } = body

    const updatedPrescription = await prisma.prescription.update({
      where: { id, userId: session.user.id },
      data: { status },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'UPDATE_STOCK',
        message: `Updated prescription status to ${status} for ${updatedPrescription.patientName}`,
        userId: session.user.id,
      },
    })

    return NextResponse.json(updatedPrescription)
  } catch (error) {
    console.error('Error updating prescription:', error)
    return NextResponse.json(
      { error: 'Failed to update prescription' },
      { status: 500 }
    )
  }
}