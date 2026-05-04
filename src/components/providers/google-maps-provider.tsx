'use client'

import { Libraries, useJsApiLoader } from '@react-google-maps/api'
import { ReactNode } from 'react'

const libraries: Libraries = ['places']

interface GoogleMapsProviderProps {
  children: ReactNode
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-maps-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
    // retries: 3,
    // retryDelay: 1000,
  })

  if (loadError) {
    console.error('Error loading Google Maps:', loadError)
    // Fallback: render children without maps functionality
    return <>{children}</>
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}