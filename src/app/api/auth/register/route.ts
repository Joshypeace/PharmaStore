import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Validation schema with coordinates
const registerSchema = z.object({
  pharmacyName: z.string().min(2, 'Pharmacy name must be at least 2 characters'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  licenseNumber: z.string().min(5, 'License number must be at least 5 characters'),
  location: z.string().min(2, 'Location is required'),
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  placeId: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = registerSchema.parse(body)
    
    const { 
      pharmacyName, 
      ownerName, 
      email, 
      phone, 
      licenseNumber, 
      location, 
      latitude, 
      longitude,
      placeId,
      password 
    } = validatedData

    // Check if pharmacy already exists
    const existingPharmacy = await prisma.pharmacy.findFirst({
      where: {
        OR: [
          { name: pharmacyName },
          { licenseNumber },
          { email }
        ]
      }
    })

    if (existingPharmacy) {
      return NextResponse.json(
        { 
          error: 'Pharmacy already exists',
          message: 'A pharmacy with this name, license number, or email already exists' 
        },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists', message: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Validate coordinates are not zero (except for testing)
    if (latitude === 0 && longitude === 0 && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Invalid location', message: 'Please provide accurate location coordinates' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create pharmacy and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the pharmacy with coordinates
      const pharmacy = await tx.pharmacy.create({
        data: {
          name: pharmacyName,
          licenseNumber,
          ownerName,
          email,
          phone,
          location, // Store the formatted address
          latitude,
          longitude,
        }
      })

      // Optional: Store placeId in a separate table or note field if needed
      // For now, we'll just log it or you could add a placeId field to Pharmacy model
      if (placeId && process.env.NODE_ENV !== 'production') {
        console.log(`Place ID for ${pharmacyName}: ${placeId}`)
      }

      // Create the user with pharmacy association
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: ownerName,
          role: 'ADMIN',
          pharmacyId: pharmacy.id,
          status: 'ACTIVE',
        }
      })

      // Create activity log
      await tx.activityLog.create({
        data: {
          type: 'LOGIN',
          message: `Pharmacy account created for ${pharmacyName} with location (${latitude}, ${longitude})`,
          userId: user.id
        }
      })

      return { pharmacy, user }
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = result.user

    return NextResponse.json(
      { 
        success: true, 
        message: 'Registration successful',
        data: {
          pharmacyId: result.pharmacy.id,
          pharmacyLocation: {
            address: result.pharmacy.location,
            coordinates: {
              latitude: result.pharmacy.latitude,
              longitude: result.pharmacy.longitude
            }
          },
          user: userWithoutPassword
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Registration error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          message: error.errors.map(e => e.message).join(', ')
        },
        { status: 400 }
      )
    }

    // Handle Prisma unique constraint errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Duplicate entry', message: 'A record with this information already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create account. Please try again later.' },
      { status: 500 }
    )
  }
}