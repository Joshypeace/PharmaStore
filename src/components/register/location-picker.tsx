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

  // Search for a place using coordinates (works even without Place ID)
  const searchByCoordinates = async (lat: number, lng: number) => {
    try {
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
    } catch (error) {
      console.error('Geocoding error:', error)
      throw new Error('Could not find address for these coordinates')
    }
  }

  // Search for a place using place ID with better error handling
  const searchByPlaceId = async (placeId: string): Promise<{ address: string; lat: number; lng: number; placeId: string; phoneNumber?: string; website?: string }> => {
    return new Promise((resolve, reject) => {
      // Validate placeId format (should be alphanumeric, not contain special chars)
      if (!placeId || placeId.length < 10 || placeId.includes(' ')) {
        reject(new Error('Invalid place ID format'))
        return
      }

      const service = new google.maps.places.PlacesService(document.createElement('div'))
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('Place details request timed out'))
      }, 10000)

      service.getDetails(
        {
          placeId: placeId,
          fields: ['formatted_address', 'geometry', 'name', 'formatted_phone_number', 'website']
        },
        (result, status) => {
          clearTimeout(timeout)
          
          if (status === 'OK' && result && result.geometry?.location) {
            resolve({
              address: result.formatted_address || result.name || '',
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
              placeId: placeId,
              phoneNumber: result.formatted_phone_number || undefined,
              website: result.website || undefined
            })
          } else {
            console.error(`Place details failed for ID: ${placeId}, Status: ${status}`)
            
            // Try to recover by using the placeId as a search query
            if (placeId && placeId.length > 0) {
              // Attempt to search by text instead
              const textService = new google.maps.places.PlacesService(document.createElement('div'))
              textService.findPlaceFromQuery(
                {
                  query: placeId,
                  fields: ['formatted_address', 'geometry', 'name']
                },
                (results, findStatus) => {
                  if (findStatus === 'OK' && results && results[0] && results[0].geometry?.location) {
                    resolve({
                      address: results[0].formatted_address || results[0].name || '',
                      lat: results[0].geometry.location.lat(),
                      lng: results[0].geometry.location.lng(),
                      placeId: results[0].place_id || placeId,
                    })
                  } else {
                    reject(new Error(`Could not find location for ID: ${placeId}`))
                  }
                }
              )
            } else {
              reject(new Error(`Could not get place details. Status: ${status}`))
            }
          }
        }
      )
    })
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

      // Get additional place details if available (with error handling)
      let phoneNumber: string | undefined
      let website: string | undefined
      
      if (placeId && placeId.length > 10) {
        try {
          const service = new google.maps.places.PlacesService(document.createElement('div'))
          const details = await new Promise<{ phoneNumber?: string; website?: string }>((resolve) => {
            const timeout = setTimeout(() => resolve({}), 5000)
            
            service.getDetails(
              {
                placeId: placeId,
                fields: ['formatted_phone_number', 'website']
              },
              (detailsResult, detailsStatus) => {
                clearTimeout(timeout)
                if (detailsStatus === 'OK' && detailsResult) {
                  resolve({
                    phoneNumber: detailsResult.formatted_phone_number || undefined,
                    website: detailsResult.website || undefined
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
      }

      setSelectedAddress(formattedAddress)
      onLocationSelect({
        formattedAddress,
        latitude: lat,
        longitude: lng,
        placeId: placeId || '',
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

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text')
    
    // Check if pasted content looks like a Google Maps URL
    const isGoogleMapsUrl = pastedText.includes('maps.app.goo.gl') || 
                            pastedText.includes('google.com/maps') ||
                            pastedText.includes('goo.gl/maps')
    
    if (!isGoogleMapsUrl) {
      return // Not a URL, let normal paste behavior happen
    }
    
    e.preventDefault()
    setIsParsingUrl(true)
    setGeocodeError(null)
    
    try {
      // Extract potential place ID or coordinates from URL
      let placeId: string | undefined
      let lat: number | undefined
      let lng: number | undefined

      // Try to extract place ID from various patterns
      const placeIdMatch = pastedText.match(/[!?&]place_id=([a-zA-Z0-9_-]+)/)
      if (placeIdMatch) {
        placeId = placeIdMatch[1]
      }
      
      const placePathMatch = pastedText.match(/\/place\/[^/]+\/([a-zA-Z0-9_-]+)/)
      if (placePathMatch && !placeId) {
        placeId = placePathMatch[1]
      }

      // Try to extract coordinates
      const coordMatch = pastedText.match(/@([-\d.]+),([-\d.]+)/)
      if (coordMatch) {
        lat = parseFloat(coordMatch[1])
        lng = parseFloat(coordMatch[2])
      }

      let locationData = null
      
      if (placeId && placeId.length > 10) {
        try {
          locationData = await searchByPlaceId(placeId)
        } catch (err) {
          console.log('Place ID lookup failed, trying coordinates', err)
        }
      }
      
      if (!locationData && lat && lng) {
        locationData = await searchByCoordinates(lat, lng)
      }
      
      if (locationData) {
        setSelectedAddress(locationData.address)
        onLocationSelect({
          formattedAddress: locationData.address,
          latitude: locationData.lat,
          longitude: locationData.lng,
          placeId: locationData.placeId,
        })
        setValue(locationData.address, false)
      } else {
        throw new Error('Could not extract location from URL')
      }
    } catch (error) {
      console.error('Error parsing pasted URL:', error)
      setGeocodeError('Could not parse Google Maps link. Please try typing the address directly instead.')
      setValue(pastedText, false)
    } finally {
      setIsParsingUrl(false)
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
            placeholder="Start typing address (e.g., Daeyang Luke Hospital, Lilongwe)"
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
          </ul>
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
        <p>💡 Tip: Just start typing the pharmacy name (e.g., &quot;Daeyang Luke Hospital, Lilongwe&quot;)</p>
        <p>📱 On mobile: Search for your pharmacy in Google Maps, tap &quot;Share&quot; → &quot;Copy address&quot;</p>
      </div>
    </div>
  )
}