import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const medicineName = searchParams.get('medicine')
    const userLat = parseFloat(searchParams.get('lat') || '0')
    const userLng = parseFloat(searchParams.get('lng') || '0')

    console.log('Search request:', { medicineName, userLat, userLng })

    if (!medicineName) {
      return NextResponse.json({ error: 'Medicine name required' }, { status: 400 })
    }

    // Find medicine by name (case insensitive partial match)
    const medicines = await prisma.medicine.findMany({
      where: {
        name: {
          contains: medicineName,
          mode: 'insensitive'
        }
      }
    })

    if (medicines.length === 0) {
      return NextResponse.json({ pharmacies: [], medicine: null })
    }

    const medicineIds = medicines.map(m => m.id)

    // Use UTC date for comparison to avoid timezone issues
    const nowUTC = new Date()
    // Set to UTC midnight to be safe
    const todayUTC = new Date(Date.UTC(
      nowUTC.getUTCFullYear(),
      nowUTC.getUTCMonth(),
      nowUTC.getUTCDate()
    ))

    console.log('Current UTC date for comparison:', todayUTC.toISOString())

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        medicineId: { in: medicineIds },
        quantity: { gt: 0 },
        expiryDate: { gt: todayUTC }
      },
      include: {
        pharmacy: true,
        medicine: true
      }
    })

    console.log(`Found ${inventoryItems.length} inventory items with stock`)

    if (inventoryItems.length === 0) {
      // Check if there are items with quantity but expired
      const expiredItems = await prisma.inventoryItem.findMany({
        where: {
          medicineId: { in: medicineIds },
          quantity: { gt: 0 },
          expiryDate: { lte: todayUTC }
        },
        include: {
          medicine: true,
          pharmacy: true
        }
      })
      
      if (expiredItems.length > 0) {
        console.log(`Found ${expiredItems.length} expired items that would have been in stock`)
        return NextResponse.json({ 
          pharmacies: [], 
          medicine: medicines[0].name,
          message: `Medicine found but all stock has expired. Last expiry: ${expiredItems[0].expiryDate}` 
        })
      }
    }

    const pharmacies = inventoryItems.map(item => {
      const distance = calculateDistance(
        userLat, userLng,
        item.pharmacy.latitude,
        item.pharmacy.longitude
      )
      const duration = calculateDuration(distance)

      return {
        id: item.pharmacy.id,
        name: item.pharmacy.name,
        location: item.pharmacy.location,
        latitude: item.pharmacy.latitude,
        longitude: item.pharmacy.longitude,
        phone: item.pharmacy.phone,
        email: item.pharmacy.email,
        inventoryItemId: item.id,
        price: item.price,
        quantity: item.quantity,
        distance: distance,
        duration: duration
      }
    }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))

    return NextResponse.json({ 
      pharmacies, 
      medicine: medicines[0].name,
      total: pharmacies.length 
    })
    
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ 
      error: 'Failed to search medicine', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === 0 && lon1 === 0) return 999
  if (lat2 === 0 && lon2 === 0) return 999
  
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

function calculateDuration(distanceKm: number): string {
  if (distanceKm === 999) return 'Distance unknown'
  const minutes = Math.round((distanceKm / 30) * 60)
  if (minutes < 60) return `${minutes} min drive`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours} hr ${remainingMinutes} min drive`
}