// app/search/page.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import {
  MapPin,
  Navigation,
  Clock,
  Phone,
  Star,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Filter,
  ChevronDown,
  X,
  Car,
  Search,
  Pill,
  Menu,
  ChevronUp,
  Navigation2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLoadScript, GoogleMap, Marker, InfoWindow, Libraries } from "@react-google-maps/api"

const libraries: Libraries = ["places"]

// Types
interface Pharmacy {
  id: string
  name: string
  address: string
  phone: string
  distance: number
  rating?: number
  openingHours?: string
  isOpen?: boolean
  price?: number
  quantity: number
  latitude: number
  longitude: number
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "500px",
}

const defaultCenter = {
  lat: -13.9626, // Lilongwe, Malawi coordinates
  lng: 33.7741,
}

export default function SearchPage() {
  const [medicine, setMedicine] = useState("")
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [mapCenter, setMapCenter] = useState(defaultCenter)
  const [mapZoom, setMapZoom] = useState(12)
  
  const [filters, setFilters] = useState({
    maxDistance: 10,
    openNow: false,
    sortBy: "distance" as "distance" | "price" | "rating",
  })

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  })

  // Get user location on component mount
  useEffect(() => {
    getUserLocation()
  }, [])

  const getUserLocation = () => {
    setLocationLoading(true)
    setLocationError(null)
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setUserLocation(location)
          setMapCenter(location)
          setLocationLoading(false)
        },
        (error) => {
          console.error("Geolocation error:", error)
          setLocationError("Unable to get your location. Using default location.")
          setLocationLoading(false)
          // Use default location (Lilongwe)
          setUserLocation(defaultCenter)
        }
      )
    } else {
      setLocationError("Geolocation is not supported by your browser.")
      setLocationLoading(false)
      setUserLocation(defaultCenter)
    }
  }

  const handleSearch = async () => {
    if (!medicine.trim()) {
      setError("Please enter a medicine name")
      return
    }

    setSearching(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        medicine: medicine.trim(),
        ...(userLocation && {
          lat: userLocation.lat.toString(),
          lng: userLocation.lng.toString(),
        }),
        maxDistance: filters.maxDistance.toString(),
        sortBy: filters.sortBy,
        openNow: filters.openNow.toString(),
      })
      
      const response = await fetch(`/api/public/search-medicine?${params}`)
      
      if (!response.ok) {
        throw new Error("Failed to search pharmacies")
      }
      
      const data = await response.json()
      setPharmacies(data.pharmacies)
      
      // Center map on first pharmacy or user location
      if (data.pharmacies.length > 0 && map) {
        const bounds = new google.maps.LatLngBounds()
        if (userLocation) {
          bounds.extend(userLocation)
        }
        data.pharmacies.forEach((pharmacy: Pharmacy) => {
          bounds.extend({ lat: pharmacy.latitude, lng: pharmacy.longitude })
        })
        map.fitBounds(bounds)
      } else if (userLocation && map) {
        map.panTo(userLocation)
        map.setZoom(12)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setPharmacies([])
    } finally {
      setSearching(false)
    }
  }

  const getDirections = (pharmacy: Pharmacy) => {
    if (userLocation) {
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${pharmacy.latitude},${pharmacy.longitude}`
      window.open(url, "_blank")
    } else {
      const url = `https://www.google.com/maps/search/${encodeURIComponent(pharmacy.name + " " + pharmacy.address)}`
      window.open(url, "_blank")
    }
  }

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`
    }
    return `${distance.toFixed(1)}km`
  }

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                <Pill className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                PharmaStore
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" className="text-slate-600 hover:text-emerald-600">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Link href="/login">
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200">
              <div className="flex flex-col space-y-3">
                <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 text-center">
            Find Medicine Near You
          </h1>
          
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Enter medicine name (e.g., Paracetamol, Amoxicillin)"
                  value={medicine}
                  onChange={(e) => setMedicine(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 pr-4 py-6 text-lg rounded-xl border-2 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={searching}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-xl shadow-emerald-200/50 rounded-xl px-8 py-6 text-lg transform hover:scale-105 transition-all duration-300"
              >
                {searching ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Find Medicine
                  </>
                )}
              </Button>
            </div>
            
            {/* Location Status */}
            {locationLoading && (
              <div className="mt-3 text-center text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                Getting your location...
              </div>
            )}
            {locationError && (
              <div className="mt-3 text-center text-sm text-amber-600">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                {locationError}
              </div>
            )}
            {userLocation && !locationLoading && (
              <div className="mt-3 text-center text-sm text-emerald-600">
                <MapPin className="h-4 w-4 inline mr-1" />
                Showing pharmacies near your location
                <Button
                  variant="link"
                  size="sm"
                  onClick={getUserLocation}
                  className="text-emerald-600 ml-2"
                >
                  Update Location
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {pharmacies.length > 0 && (
          <div className="mb-4 flex justify-between items-center">
            <p className="text-slate-600">
              Found {pharmacies.length} {pharmacies.length === 1 ? "pharmacy" : "pharmacies"} with {medicine}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Filters Sidebar - Desktop */}
          {pharmacies.length > 0 && (
            <div className={`${showFilters ? "block" : "hidden"} lg:block`}>
              <Card className="sticky top-24">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters({
                        maxDistance: 10,
                        openNow: false,
                        sortBy: "distance",
                      })}
                      className="text-emerald-600"
                    >
                      Reset
                    </Button>
                  </div>

                  {/* Distance Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Maximum Distance: {filters.maxDistance}km
                    </label>
                    <Slider
                      value={[filters.maxDistance]}
                      onValueChange={(value) => setFilters({ ...filters, maxDistance: value[0] })}
                      max={50}
                      step={1}
                      className="mb-2"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSearch()}
                      className="w-full mt-2"
                    >
                      Apply Filter
                    </Button>
                  </div>

                  {/* Open Now Filter */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="openNow"
                        checked={filters.openNow}
                        onCheckedChange={(checked) => {
                          setFilters({ ...filters, openNow: checked as boolean })
                          setTimeout(() => handleSearch(), 100)
                        }}
                      />
                      <Label htmlFor="openNow">Open Now</Label>
                    </div>
                  </div>

                  {/* Sort By */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Sort By
                    </label>
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value: "distance" | "price" | "rating") => {
                        setFilters({ ...filters, sortBy: value })
                        setTimeout(() => handleSearch(), 100)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="distance">Distance (Nearest First)</SelectItem>
                        <SelectItem value="price">Price (Low to High)</SelectItem>
                        <SelectItem value="rating">Rating (Highest First)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Map and Results */}
          <div className={pharmacies.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
            {/* Google Map */}
            {isLoaded && !loadError && (
              <Card className="mb-6 overflow-hidden">
                <div className="h-[400px] md:h-[500px] w-full">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}
                    zoom={mapZoom}
                    onLoad={onMapLoad}
                    options={{
                      zoomControl: true,
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: true,
                    }}
                  >
                    {/* User Location Marker */}
                    {userLocation && (
                      <Marker
                        position={userLocation}
                        icon={{
                          url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                          scaledSize: new google.maps.Size(40, 40),
                        }}
                      />
                    )}
                    
                    {/* Pharmacy Markers */}
                    {pharmacies.map((pharmacy) => (
                      <Marker
                        key={pharmacy.id}
                        position={{ lat: pharmacy.latitude, lng: pharmacy.longitude }}
                        onClick={() => setSelectedPharmacy(pharmacy)}
                        icon={{
                          url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
                          scaledSize: new google.maps.Size(40, 40),
                        }}
                      />
                    ))}
                    
                    {/* Info Window for Selected Pharmacy */}
                    {selectedPharmacy && (
                      <InfoWindow
                        position={{ lat: selectedPharmacy.latitude, lng: selectedPharmacy.longitude }}
                        onCloseClick={() => setSelectedPharmacy(null)}
                      >
                        <div className="p-2 max-w-xs">
                          <h3 className="font-semibold text-slate-900 mb-1">{selectedPharmacy.name}</h3>
                          <p className="text-sm text-slate-600 mb-2">{selectedPharmacy.address}</p>
                          <div className="flex items-center text-sm mb-2">
                            <Navigation className="h-3 w-3 text-emerald-500 mr-1" />
                            <span>{formatDistance(selectedPharmacy.distance)} away</span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => getDirections(selectedPharmacy)}
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm"
                          >
                            <Car className="h-3 w-3 mr-1" />
                            Get Directions
                          </Button>
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                </div>
              </Card>
            )}
            
            {loadError && (
              <Card className="mb-6 bg-yellow-50 border-yellow-200">
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-yellow-700">Error loading Google Maps. Please check your API key.</p>
                </CardContent>
              </Card>
            )}

            {/* Results List */}
            {searching ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : error ? (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={handleSearch} variant="outline">
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : pharmacies.length === 0 && medicine && !searching ? (
              <Card>
                <CardContent className="pt-12 text-center">
                  <div className="text-6xl mb-4">🏥</div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    No Pharmacies Found
                  </h3>
                  <p className="text-slate-600 mb-6">
                    We couldnt find any pharmacies with {medicine} in stock within {filters.maxDistance}km.
                  </p>
                  <Button
                    onClick={() => setFilters({ ...filters, maxDistance: 20 })}
                    variant="outline"
                    className="mr-3"
                  >
                    Expand to 20km
                  </Button>
                  <Button
                    onClick={() => setFilters({ ...filters, maxDistance: 50 })}
                    variant="outline"
                  >
                    Expand to 50km
                  </Button>
                </CardContent>
              </Card>
            ) : pharmacies.length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {pharmacies.map((pharmacy) => (
                  <Card
                    key={pharmacy.id}
                    className={`hover:shadow-lg transition-all cursor-pointer ${
                      selectedPharmacy?.id === pharmacy.id ? "ring-2 ring-emerald-500" : ""
                    }`}
                    onClick={() => {
                      setSelectedPharmacy(pharmacy)
                      // Center map on selected pharmacy
                      if (map) {
                        map.panTo({ lat: pharmacy.latitude, lng: pharmacy.longitude })
                        map.setZoom(15)
                      }
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                                {pharmacy.name}
                              </h3>
                              <div className="flex items-center text-sm text-slate-600 mb-2">
                                <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                                <span className="line-clamp-2">{pharmacy.address}</span>
                              </div>
                            </div>
                            {pharmacy.rating && (
                              <div className="flex items-center ml-2">
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                <span className="ml-1 text-sm text-slate-700">{pharmacy.rating}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-4 mb-4">
                            <div className="flex items-center text-sm">
                              <Navigation className="h-4 w-4 text-emerald-500 mr-1" />
                              <span className="font-medium">{formatDistance(pharmacy.distance)}</span>
                              <span className="text-slate-600 ml-1">away</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <Clock className="h-4 w-4 text-emerald-500 mr-1" />
                              <span className={pharmacy.isOpen ? "text-green-600" : "text-red-600"}>
                                {pharmacy.isOpen ? "Open Now" : "Closed"}
                              </span>
                            </div>
                            <div className="flex items-center text-sm">
                              <Phone className="h-4 w-4 text-emerald-500 mr-1" />
                              <span>{pharmacy.phone}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              {pharmacy.quantity} in stock
                            </Badge>
                            {pharmacy.price && (
                              <span className="text-lg font-bold text-slate-900">
                                MWK {pharmacy.price.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              getDirections(pharmacy)
                            }}
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                          >
                            <Navigation2 className="h-4 w-4 mr-2" />
                            Directions
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}