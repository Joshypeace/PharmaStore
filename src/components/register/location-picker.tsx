'use client'

import { useEffect, useRef, useState } from 'react'
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2, CheckCircle, AlertCircle, Link as LinkIcon } from 'lucide-react'

interface LocationPickerProps {
  onLocationSelect: (location: {
    formattedAddress: string
    latitude: number
    longitude: number
    placeId: string
    phoneNumber?: string
    website?: string
  }) => void
  initialValue?: string
  error?: string
}

export function LocationPicker({ onLocationSelect, initialValue = '', error }: LocationPickerProps) {
  const [selectedAddress, setSelectedAddress] = useState(initialValue)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const [isParsingUrl, setIsParsingUrl] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'mw' },
      types: ['geocode', 'establishment'],
    },
    debounce: 300,
    cache: 86400,
  })

  // Clear geocode error when user starts typing
  useEffect(() => {
    if (value !== selectedAddress) {
      setGeocodeError(null)
    }
  }, [value, selectedAddress])

  // Extract place ID or coordinates from Google Maps URL (no fetch needed!)
  const extractLocationFromUrl = (url: string): { placeId?: string; lat?: number; lng?: number } => {
    let placeId: string | undefined
    let lat: number | undefined
    let lng: number | undefined

    // Pattern 1: Place ID in URL - https://www.google.com/maps/place/Place+Name/@lat,lng,zoom/data=!3m1!4b1!4m6!3m5!1sCHIJabcdef...
    // Look for !1s followed by place ID
    const placeIdMatch = url.match(/!1s([a-zA-Z0-9_-]+)/)
    if (placeIdMatch) {
      placeId = placeIdMatch[1]
    }

    // Pattern 2: Direct place ID in /place/ path
    const placePathMatch = url.match(/\/place\/[^/]+\/([a-zA-Z0-9_-]+)/)
    if (placePathMatch && !placeId) {
      placeId = placePathMatch[1]
    }

    // Pattern 3: Coordinates from @lat,lng zoom
    const coordMatch = url.match(/@([-\d.]+),([-\d.]+)/)
    if (coordMatch) {
      lat = parseFloat(coordMatch[1])
      lng = parseFloat(coordMatch[2])
    }

    // Pattern 4: !3d and !4d parameters (latitude and longitude)
    const latParamMatch = url.match(/!3d([-\d.]+)/)
    const lngParamMatch = url.match(/!4d([-\d.]+)/)
    if (latParamMatch && lngParamMatch) {
      lat = parseFloat(latParamMatch[1])
      lng = parseFloat(lngParamMatch[1])
    }

    return { placeId, lat, lng }
  }

  // Search for a place using coordinates
  const searchByCoordinates = async (lat: number, lng: number) => {
    const geocoder = new google.maps.Geocoder()
    const result = await geocoder.geocode({
      location: { lat, lng }
    })
    if (result.results[0]) {
      return {
        address: result.results[0].formatted_address,
        lat,
        lng,
        placeId: result.results[0].place_id,
      }
    }
    throw new Error('Could not find address for these coordinates')
  }

  // Search for a place using place ID
  const searchByPlaceId = async (placeId: string): Promise<{ address: string; lat: number; lng: number; placeId: string; phoneNumber?: string; website?: string }> => {
    return new Promise((resolve, reject) => {
      const service = new google.maps.places.PlacesService(document.createElement('div'))
      service.getDetails(
        {
          placeId: placeId,
          fields: ['formatted_address', 'geometry', 'name', 'formatted_phone_number', 'website']
        },
        (result, status) => {
          if (status === 'OK' && result && result.geometry?.location) {
            resolve({
              address: result.formatted_address || result.name || '',
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
              placeId: placeId,
              phoneNumber: result.formatted_phone_number,
              website: result.website
            })
          } else {
            reject(new Error(`Could not get place details for ID: ${placeId}. Status: ${status}`))
          }
        }
      )
    })
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
  const pastedText = e.clipboardData.getData('text')
  
  const isGoogleMapsUrl = pastedText.includes('maps.app.goo.gl') || 
                          pastedText.includes('google.com/maps') ||
                          pastedText.includes('goo.gl/maps')
  
  if (!isGoogleMapsUrl) return
  
  e.preventDefault()
  setIsParsingUrl(true)
  setGeocodeError(null)
  
  try {
    let urlToParse = pastedText

    // Resolve shortened URLs server-side to avoid CORS
    if (pastedText.includes('maps.app.goo.gl') || pastedText.includes('goo.gl/maps')) {
      const res = await fetch(`/api/resolve-maps-url?url=${encodeURIComponent(pastedText)}`)
      const data = await res.json()
      if (!data.resolvedUrl) throw new Error('Could not resolve shortened URL')
      urlToParse = data.resolvedUrl
    }

    const { placeId, lat, lng } = extractLocationFromUrl(urlToParse)
    
    let locationData: { 
      address: string; lat: number; lng: number
      placeId: string; phoneNumber?: string; website?: string 
    } | null = null
    
    if (placeId) {
      locationData = await searchByPlaceId(placeId)
    } else if (lat && lng) {
      const coordsData = await searchByCoordinates(lat, lng)
      locationData = { ...coordsData }
    } else {
      throw new Error('Could not extract place ID or coordinates from URL')
    }
    
    if (locationData) {
      setSelectedAddress(locationData.address)
      onLocationSelect({
        formattedAddress: locationData.address,
        latitude: locationData.lat,
        longitude: locationData.lng,
        placeId: locationData.placeId,
        phoneNumber: locationData.phoneNumber,
        website: locationData.website,
      })
      setValue(locationData.address, false)
    }
  } catch (error) {
    console.error('Error parsing pasted URL:', error)
    setGeocodeError('Could not parse Google Maps link. Please try typing the address instead.')
    setValue(pastedText, false)
  } finally {
    setIsParsingUrl(false)
  }
}

  const handleSelect = async (address: string) => {
    setValue(address, false)
    clearSuggestions()
    setIsGeocoding(true)
    setGeocodeError(null)

    try {
      const results = await getGeocode({ address })
      
      if (!results || results.length === 0) {
        throw new Error('No results found')
      }

      const result = results[0]
      const { lat, lng } = await getLatLng(result)
      
      const formattedAddress = result.formatted_address
      const placeId = result.place_id

      // Get additional place details if available
      let phoneNumber: string | undefined
      let website: string | undefined
      try {
        const service = new google.maps.places.PlacesService(document.createElement('div'))
        const details = await new Promise<{ phoneNumber?: string; website?: string }>((resolve) => {
          service.getDetails(
            {
              placeId: placeId,
              fields: ['formatted_phone_number', 'website']
            },
            (result, status) => {
              if (status === 'OK' && result) {
                resolve({
                  phoneNumber: result.formatted_phone_number || undefined,
                  website: result.website || undefined
                })
              } else {
                resolve({})
              }
            }
          )
        })
        phoneNumber = details.phoneNumber
        website = details.website
      } catch (err) {
        console.log('Could not fetch additional details:', err)
      }

      setSelectedAddress(formattedAddress)
      onLocationSelect({
        formattedAddress,
        latitude: lat,
        longitude: lng,
        placeId,
        phoneNumber,
        website,
      })

      setValue(formattedAddress, false)
    } catch (error) {
      console.error('Error geocoding address:', error)
      setGeocodeError('Could not find coordinates for this address. Please try a more specific location.')
      onLocationSelect({
        formattedAddress: address,
        latitude: 0,
        longitude: 0,
        placeId: '',
      })
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    setSelectedAddress('')
    setGeocodeError(null)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="location">
        Pharmacy Location <span className="text-red-500">*</span>
      </Label>
      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
          <Input
            ref={inputRef}
            id="location"
            type="text"
            placeholder="Start typing address OR paste Google Maps link (e.g., https://maps.app.goo.gl/...)"
            value={value}
            onChange={handleInputChange}
            onPaste={handlePaste}
            disabled={!ready || isGeocoding || isParsingUrl}
            className={`pl-10 h-11 ${error || geocodeError ? 'border-red-500' : ''}`}
            aria-invalid={!!(error || geocodeError)}
            aria-describedby={error || geocodeError ? 'location-error' : undefined}
          />
          {(isGeocoding || isParsingUrl) && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        {/* Suggestions dropdown */}
        {status === 'OK' && value && !isGeocoding && !isParsingUrl && (
          <ul className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            {data.map(({ place_id, description, structured_formatting }) => (
              <li key={place_id}>
                <button
                  type="button"
                  onClick={() => handleSelect(description)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors focus:bg-gray-50 focus:outline-none"
                >
                  <div className="font-medium">{structured_formatting?.main_text || description}</div>
                  {structured_formatting?.secondary_text && (
                    <div className="text-sm text-gray-500">{structured_formatting.secondary_text}</div>
                  )}
                </button>
              </li>
            ))}
            {/* Hint for pasting URLs */}
            <li className="border-t px-4 py-2 bg-gray-50">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                Can&apos;t find it? Paste a Google Maps link instead
              </div>
            </li>
          </ul>
        )}

        {/* Loading state */}
        {status === 'OK' && value && !ready && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg p-4 text-center text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            Loading suggestions...
          </div>
        )}
      </div>

      {/* Error messages */}
      {(error || geocodeError) && (
        <p id="location-error" className="text-sm text-red-500 flex items-center gap-1 mt-1">
          <AlertCircle className="h-3 w-3" />
          {error || geocodeError}
        </p>
      )}

      {/* Success message */}
      {selectedAddress && !geocodeError && !error && (
        <div className="text-sm text-green-600 flex items-center gap-1 mt-1">
          <CheckCircle className="h-3 w-3" />
          Location set: {selectedAddress}
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-gray-500 mt-1 space-y-1">
        <p>📍 Enter your complete pharmacy address for accurate map location</p>
        <p>🔗 Or paste a Google Maps link (e.g., from Google Maps app Share button)</p>
        <p className="text-emerald-600">💡 Tip: Search for &quot;Daeyang Luke Hospital, Lilongwe&quot; or paste its Google Maps link</p>
      </div>
    </div>
  )
}