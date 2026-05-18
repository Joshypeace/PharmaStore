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

    // Get current UTC date for expiry check
    const nowUTC = new Date()
    const todayUTC = new Date(Date.UTC(
      nowUTC.getUTCFullYear(),
      nowUTC.getUTCMonth(),
      nowUTC.getUTCDate()
    ))

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

    // Calculate accurate distances using Haversine formula
    const pharmacies = inventoryItems.map(item => {
      const distance = calculateDistance(
        userLat, userLng,
        item.pharmacy.latitude,
        item.pharmacy.longitude
      )
      const duration = calculateDuration(distance)
      const priceInMWK = Math.round(item.price) // Ensure price is in MWK

      return {
        id: item.pharmacy.id,
        name: item.pharmacy.name,
        location: item.pharmacy.location,
        latitude: item.pharmacy.latitude,
        longitude: item.pharmacy.longitude,
        phone: item.pharmacy.phone,
        email: item.pharmacy.email,
        inventoryItemId: item.id,
        price: priceInMWK,
        quantity: item.quantity,
        distance: parseFloat(distance.toFixed(1)),
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

// Accurate Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Handle missing coordinates
  if (!lat1 || !lon1 || lat1 === 0 || lon1 === 0) return 999
  if (!lat2 || !lon2 || lat2 === 0 || lon2 === 0) return 999
  
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  // Return distance rounded to 1 decimal place, minimum 0.1 km
  return Math.max(0.1, parseFloat(distance.toFixed(1)))
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// More accurate duration calculation based on distance and estimated speed
function calculateDuration(distanceKm: number): string {
  if (distanceKm === 999) return 'Distance unavailable'
  
  // Different speeds based on distance and location type
  let estimatedSpeedKmh = 30 // Default city speed
  
  if (distanceKm < 2) {
    estimatedSpeedKmh = 25 // Short distances, slower due to local roads
  } else if (distanceKm < 10) {
    estimatedSpeedKmh = 35 // Medium distances, mix of roads
  } else {
    estimatedSpeedKmh = 50 // Longer distances, faster roads
  }
  
  const minutes = Math.round((distanceKm / estimatedSpeedKmh) * 60)
  
  if (minutes < 1) return 'Less than 1 min'
  if (minutes === 1) return '1 min'
  if (minutes < 60) return `${minutes} mins`
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) return `${hours} hr`
  return `${hours} hr ${remainingMinutes} mins`
}