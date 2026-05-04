'use client'

import { useEffect, useRef, useState } from 'react'
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2, CheckCircle, AlertCircle, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

  // Parse Google Maps URL and extract location
  const parseGoogleMapsUrl = async (url: string) => {
    try {
      // Extract place ID from various Google Maps URL formats
      let placeId = null
      let coordinates = null

      // Format 1: https://maps.app.goo.gl/xxxxxx
      if (url.includes('maps.app.goo.gl')) {
        // Need to follow redirect to get actual place ID
        const response = await fetch(url, { method: 'HEAD' })
        const finalUrl = response.url
        return parseGoogleMapsUrl(finalUrl)
      }
      
      // Format 2: https://www.google.com/maps/place/...
      const placeMatch = url.match(/place\/([^\/\?]+)/)
      if (placeMatch) {
        placeId = decodeURIComponent(placeMatch[1])
      }
      
      // Format 3: https://www.google.com/maps/@lat,lng,zoom
      const coordMatch = url.match(/@([-\d.]+),([-\d.]+)/)
      if (coordMatch) {
        coordinates = {
          lat: parseFloat(coordMatch[1]),
          lng: parseFloat(coordMatch[2])
        }
      }

      // Format 4: Short link with !3d and !4d parameters
      const latMatch = url.match(/!3d([-\d.]+)/)
      const lngMatch = url.match(/!4d([-\d.]+)/)
      if (latMatch && lngMatch) {
        coordinates = {
          lat: parseFloat(latMatch[1]),
          lng: parseFloat(lngMatch[1])
        }
      }

      if (placeId) {
        // Use Place ID to get details
        const service = new google.maps.places.PlacesService(document.createElement('div'))
        return new Promise((resolve, reject) => {
          service.getDetails(
            {
              placeId: placeId,
              fields: ['formatted_address', 'geometry', 'name', 'formatted_phone_number', 'website']
            },
            (result, status) => {
              if (status === 'OK' && result) {
                resolve({
                  address: result.formatted_address,
                  lat: result.geometry?.location?.lat(),
                  lng: result.geometry?.location?.lng(),
                  placeId: placeId,
                  phoneNumber: result.formatted_phone_number,
                  website: result.website
                })
              } else {
                reject(new Error('Could not get place details'))
              }
            }
          )
        })
      } else if (coordinates) {
        // Use coordinates to get address
        const geocoder = new google.maps.Geocoder()
        const result = await geocoder.geocode({
          location: { lat: coordinates.lat, lng: coordinates.lng }
        })
        if (result.results[0]) {
          return {
            address: result.results[0].formatted_address,
            lat: coordinates.lat,
            lng: coordinates.lng,
            placeId: result.results[0].place_id,
            phoneNumber: '',
            website: ''
          }
        }
      }
      
      throw new Error('Could not parse Google Maps URL')
    } catch (error) {
      console.error('Error parsing Google Maps URL:', error)
      throw error
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
      let phoneNumber, website
      try {
        const service = new google.maps.places.PlacesService(document.createElement('div'))
        const details = await new Promise((resolve, reject) => {
          service.getDetails(
            {
              placeId: placeId,
              fields: ['formatted_phone_number', 'website']
            },
            (result, status) => {
              if (status === 'OK' && result) {
                resolve({
                  phoneNumber: result.formatted_phone_number,
                  website: result.website
                })
              } else {
                resolve({ phoneNumber: '', website: '' })
              }
            }
          )
        })
        phoneNumber = (details as { phoneNumber: string }).phoneNumber
        website = (details as { website: string }).website
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

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text')
    
    // Check if pasted content is a Google Maps URL
    if (pastedText.includes('maps.app.goo.gl') || 
        pastedText.includes('google.com/maps') ||
        pastedText.includes('goo.gl/maps')) {
      
      e.preventDefault()
      setIsParsingUrl(true)
      setGeocodeError(null)
      
      try {
        const locationData = await parseGoogleMapsUrl(pastedText)
        if (locationData && (locationData as { address: string }).address) {
          const data = locationData as {address: string, lat: number, lng: number, placeId: string, phoneNumber?: string, website?: string }
          setSelectedAddress(data.address)
          onLocationSelect({
            formattedAddress: data.address,
            latitude: data.lat,
            longitude: data.lng,
            placeId: data.placeId,
            phoneNumber: data.phoneNumber,
            website: data.website,
          })
          setValue(data.address, false)
        } else {
          throw new Error('Could not extract location from URL')
        }
      } catch (error) {
        console.error('Error parsing pasted URL:', error)
        setGeocodeError('Could not parse Google Maps link. Please try typing the address instead.')
        // Allow manual entry
        setValue(pastedText, false)
      } finally {
        setIsParsingUrl(false)
      }
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