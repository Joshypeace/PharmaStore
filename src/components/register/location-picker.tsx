'use client'

import { useEffect, useRef, useState } from 'react'
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface LocationPickerProps {
  onLocationSelect: (location: {
    formattedAddress: string
    latitude: number
    longitude: number
    placeId: string
  }) => void
  initialValue?: string
  error?: string
}

export function LocationPicker({ onLocationSelect, initialValue = '', error }: LocationPickerProps) {
  const [selectedAddress, setSelectedAddress] = useState(initialValue)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'mw' }, // Restrict to Malawi
      types: ['geocode', 'establishment'], // Include both addresses and establishments
    },
    debounce: 300,
    cache: 86400, // Cache results for 24 hours
  })

  // Clear geocode error when user starts typing
  useEffect(() => {
    if (value !== selectedAddress) {
      setGeocodeError(null)
    }
  }, [value, selectedAddress])

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

      setSelectedAddress(formattedAddress)
      onLocationSelect({
        formattedAddress,
        latitude: lat,
        longitude: lng,
        placeId,
      })

      // Update input value with formatted address
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
            placeholder="Start typing your pharmacy address (e.g., Lilongwe City Centre)"
            value={value}
            onChange={handleInputChange}
            disabled={!ready || isGeocoding}
            className={`pl-10 h-11 ${error || geocodeError ? 'border-red-500' : ''}`}
            aria-invalid={!!(error || geocodeError)}
            aria-describedby={error || geocodeError ? 'location-error' : undefined}
          />
          {isGeocoding && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        {/* Suggestions dropdown */}
        {status === 'OK' && value && !isGeocoding && (
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
      <p className="text-xs text-gray-500 mt-1">
        Enter your complete pharmacy address for accurate map location
      </p>
    </div>
  )
}