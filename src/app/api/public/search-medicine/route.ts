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
      console.log('No medicine found with name:', medicineName)
      return NextResponse.json({ pharmacies: [], medicine: null })
    }

    // Get the first matching medicine
    const medicine = medicines[0]
    console.log('Found medicine:', medicine.name)

    // Find all inventory items with this medicine that have stock
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        medicineId: medicine.id,
        quantity: { gt: 0 },
        expiryDate: { gt: new Date() }
      },
      include: {
        pharmacy: true,
        medicine: true
      }
    })

    console.log(`Found ${inventoryItems.length} inventory items with stock`)

    // Calculate distances and prepare response
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
      medicine: medicine.name,
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

// Haversine formula to calculate distance between two coordinates in kilometers
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === 0 && lon1 === 0) return 999 // No user location
  
  const R = 6371 // Earth's radius in km
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
  // Average driving speed in city: 30 km/h
  const minutes = Math.round((distanceKm / 30) * 60)
  if (minutes < 60) return `${minutes} min drive`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours} hr ${remainingMinutes} min drive`
}