"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  Search, 
  Pill, 
  MapPin, 
  Navigation, 
  Clock, 
  DollarSign, 
  MessageCircle, 
  CheckCircle, 
  AlertCircle,
  X,
  TrendingUp,
  Phone,
  Mail,
  Star,
  ChevronRight,
  Loader2,
  Package,
  Store,
  WifiOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'

interface Pharmacy {
  id: string
  name: string
  location: string
  latitude: number
  longitude: number
  phone: string
  email: string
  inventoryItemId: string
  price: number
  quantity: number
  distance?: number
  duration?: string
  rating?: number
}

interface SearchHistory {
  term: string
  timestamp: number
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  
  const [searchTerm, setSearchTerm] = useState(initialQuery)
  const [searchResults, setSearchResults] = useState<Pharmacy[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false)
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [trendingSearches] = useState(['Paracetamol', 'Amoxicillin', 'Vitamin C', 'Ibuprofen', 'Metformin'])
  
  // Order form state
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null)
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    quantity: 1,
    notes: ''
  })
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<{ orderNumber: string; message: string } | null>(null)

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('medicineSearchHistory')
    if (saved) {
      try {
        const history = JSON.parse(saved)
        setSearchHistory(history.slice(0, 5))
      } catch (e) {}
    }
  }, [])

  // Save search to history
  const saveToHistory = (term: string) => {
    const newHistory = [{ term, timestamp: Date.now() }, ...searchHistory.filter(h => h.term !== term)].slice(0, 5)
    setSearchHistory(newHistory)
    localStorage.setItem('medicineSearchHistory', JSON.stringify(newHistory))
  }

  // Get user location
  const getUserLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = { 
            lat: position.coords.latitude, 
            lng: position.coords.longitude 
          }
          setUserLocation(location)
          setLocationPermissionDenied(false)
          resolve(location)
        },
        (error) => {
          console.error('Location error:', error)
          setLocationPermissionDenied(true)
          
          // Fallback to Lilongwe center (Malawi)
          const fallbackLocation = { lat: -13.9833, lng: 33.7833 }
          setUserLocation(fallbackLocation)
          resolve(fallbackLocation)
        }
      )
    })
  }, [])

  // Search medicine
  const searchMedicine = useCallback(async (query: string, location?: { lat: number; lng: number }) => {
    if (!query.trim()) {
      toast({ title: 'Error', description: 'Please enter a medicine name', variant: 'destructive' })
      return
    }

    setIsSearching(true)
    setHasSearched(true)
    
    let currentLocation = location
    if (!currentLocation) {
      try {
        currentLocation = await getUserLocation()
      } catch (error) {
        currentLocation = { lat: -13.9833, lng: 33.7833 }
      }
    }

    try {
      const response = await fetch(
        `/api/public/search-medicine?medicine=${encodeURIComponent(query)}&lat=${currentLocation.lat}&lng=${currentLocation.lng}`
      )
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)
      
      setSearchResults(data.pharmacies || [])
      
      if (data.pharmacies?.length === 0) {
        toast({ 
          title: 'No Results', 
          description: `No pharmacies found with "${query}" in stock`,
          variant: 'destructive'
        })
      } else {
        toast({ 
          title: 'Found!', 
          description: `${data.pharmacies.length} pharmacy(s) have ${query} in stock`
        })
        saveToHistory(query)
        // Update URL without reload
        router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false })
      }
    } catch (error) {
      console.error('Search error:', error)
      toast({ title: 'Error', description: 'Failed to search for medicine', variant: 'destructive' })
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [getUserLocation, router])

  // Initial search if query param exists
  useEffect(() => {
    if (initialQuery) {
      setSearchTerm(initialQuery)
      getUserLocation().then(location => {
        searchMedicine(initialQuery, location)
      })
    }
  }, [initialQuery, getUserLocation, searchMedicine])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    await searchMedicine(searchTerm, userLocation || undefined)
  }

  const handleQuickSearch = (term: string) => {
    setSearchTerm(term)
    searchMedicine(term, userLocation || undefined)
  }

  const openOrderDialog = (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy)
    setOrderForm({ ...orderForm, quantity: 1, customerName: '', customerPhone: '', customerEmail: '', notes: '' })
    setOrderSuccess(null)
  }

  const placeOrder = async () => {
    if (!selectedPharmacy) return
    
    if (!orderForm.customerName || !orderForm.customerPhone) {
      toast({ title: 'Error', description: 'Please provide your name and phone number', variant: 'destructive' })
      return
    }

    if (orderForm.quantity > selectedPharmacy.quantity) {
      toast({ title: 'Error', description: `Only ${selectedPharmacy.quantity} units available`, variant: 'destructive' })
      return
    }

    setIsPlacingOrder(true)
    try {
      const response = await fetch('/api/public/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyId: selectedPharmacy.id,
          medicineName: searchTerm,
          inventoryItemId: selectedPharmacy.inventoryItemId,
          quantity: orderForm.quantity,
          customerName: orderForm.customerName,
          customerPhone: orderForm.customerPhone,
          customerEmail: orderForm.customerEmail,
          notes: orderForm.notes
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setOrderSuccess({
        orderNumber: data.orderNumber,
        message: data.message
      })
      
      toast({
        title: 'Order Placed!',
        description: `Your order #${data.orderNumber} has been placed successfully.`
      })
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setSelectedPharmacy(null)
        setOrderSuccess(null)
      }, 3000)
      
    } catch (error) {
      console.error('Order error:', error)
      toast({ title: 'Error', description: 'Failed to place order', variant: 'destructive' })
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const openDirections = (pharmacy: Pharmacy) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`)
  }

  const sendWhatsAppMessage = (pharmacy: Pharmacy) => {
    const message = `Hello, I'm interested in ${searchTerm} at your pharmacy.`
    window.open(`https://wa.me/${pharmacy.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`)
  }

  // Render loading skeleton
  const renderSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-64 mb-3" />
            <Skeleton className="h-4 w-40 mb-4" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Pill className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Medicine Finder</h1>
            </div>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search for medicine (e.g., Paracetamol, Amoxicillin, Metformin...)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 text-gray-900 bg-white border-0 focus-visible:ring-2 focus-visible:ring-emerald-500"
                  />
                </div>
                <Button type="submit" disabled={isSearching} className="h-12 px-6 bg-white text-emerald-600 hover:bg-gray-100">
                  {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                </Button>
              </div>
            </form>

            {/* Quick filters */}
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {trendingSearches.map(term => (
                <button
                  key={term}
                  onClick={() => handleQuickSearch(term)}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-sm whitespace-nowrap transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Location Status */}
          {locationPermissionDenied && (
            <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-800">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm">Location access denied. Showing results for Lilongwe area.</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => getUserLocation()}>Try Again</Button>
            </div>
          )}

          {/* Search History */}
          {!hasSearched && searchHistory.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                <Clock className="h-4 w-4" /> Recent Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickSearch(item.term)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
                  >
                    {item.term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Section */}
          {!hasSearched && (
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" /> Trending Medicines
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {trendingSearches.map(term => (
                  <button
                    key={term}
                    onClick={() => handleQuickSearch(term)}
                    className="p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-center group"
                  >
                    <Pill className="h-6 w-6 mx-auto text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-gray-700">{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results Section */}
          {hasSearched && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {searchResults.length > 0 
                    ? `${searchResults.length} pharmacy(s) with "${searchTerm}" in stock`
                    : !isSearching && `No results for "${searchTerm}"`
                  }
                </h2>
                {searchResults.length > 0 && (
                  <Badge variant="outline" className="text-emerald-600">
                    Sorted by distance
                  </Badge>
                )}
              </div>

              {isSearching ? (
                renderSkeleton()
              ) : (
                <div className="grid gap-5">
                  {searchResults.map((pharmacy, index) => (
                    //had to set the key as the index just check the schema for duplicate entries 
                    <Card key={index} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          {/* Left - Pharmacy Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{pharmacy.name}</h3>
                                {pharmacy.rating && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                    <span className="text-sm text-gray-600">{pharmacy.rating}</span>
                                  </div>
                                )}
                              </div>
                              <Badge className="bg-emerald-100 text-emerald-700">
                                <Package className="h-3 w-3 mr-1" /> In Stock
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 mt-3">
                              <div className="flex items-start gap-2 text-gray-600">
                                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span className="text-sm">{pharmacy.location}</span>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-4 text-sm">
                                {pharmacy.distance !== undefined && (
                                  <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                    <Navigation className="h-3.5 w-3.5" />
                                    <span>{pharmacy.distance.toFixed(1)} km away</span>
                                  </div>
                                )}
                                {pharmacy.duration && (
                                  <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{pharmacy.duration}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center justify-between pt-2 border-t mt-2">
                                <div className="flex items-baseline gap-1">
                                  <DollarSign className="h-4 w-4 text-emerald-600" />
                                  <span className="text-2xl font-bold text-emerald-600">
                                    MWK {pharmacy.price.toLocaleString()}
                                  </span>
                                  <span className="text-sm text-gray-500">per unit</span>
                                </div>
                                <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                                  {pharmacy.quantity} units available
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right - Actions */}
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button onClick={() => openOrderDialog(pharmacy)} className="bg-emerald-600 hover:bg-emerald-700 w-full">
                                  Order Now
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                {orderSuccess ? (
                                  <div className="text-center py-8">
                                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">Order Placed!</h3>
                                    <p className="text-gray-600 mb-2">Order #{orderSuccess.orderNumber}</p>
                                    <p className="text-sm text-gray-500">{orderSuccess.message}</p>
                                    <Button onClick={() => setSelectedPharmacy(null)} className="mt-6">
                                      Close
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <DialogHeader>
                                      <DialogTitle>Order {searchTerm}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="font-medium">{selectedPharmacy?.name}</p>
                                        <p className="text-sm text-gray-600 mt-1">
                                          Price: MWK {selectedPharmacy?.price.toLocaleString()} per unit
                                        </p>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label>Your Name *</Label>
                                        <Input
                                          value={orderForm.customerName}
                                          onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                                          placeholder="Full name"
                                        />
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label>Phone Number *</Label>
                                        <Input
                                          value={orderForm.customerPhone}
                                          onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })}
                                          placeholder="WhatsApp number for updates"
                                        />
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label>Email (Optional)</Label>
                                        <Input
                                          type="email"
                                          value={orderForm.customerEmail}
                                          onChange={(e) => setOrderForm({ ...orderForm, customerEmail: e.target.value })}
                                          placeholder="email@example.com"
                                        />
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label>Quantity *</Label>
                                        <Input
                                          type="number"
                                          min="1"
                                          max={selectedPharmacy?.quantity}
                                          value={orderForm.quantity}
                                          onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 1 })}
                                        />
                                        <p className="text-xs text-gray-500">Max available: {selectedPharmacy?.quantity}</p>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label>Notes (Optional)</Label>
                                        <Textarea
                                          value={orderForm.notes}
                                          onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                                          placeholder="Any special instructions"
                                          rows={2}
                                        />
                                      </div>
                                      
                                      <div className="rounded-lg bg-emerald-50 p-3">
                                        <div className="flex justify-between text-sm">
                                          <span className="text-gray-600">Total:</span>
                                          <span className="font-bold text-emerald-700">
                                            MWK {((selectedPharmacy?.price || 0) * orderForm.quantity).toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <Button onClick={placeOrder} disabled={isPlacingOrder} className="w-full">
                                        {isPlacingOrder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
                                      </Button>
                                      
                                      <p className="text-xs text-gray-500 text-center">
                                        {`The pharmacy will confirm availability. You'll receive updates on WhatsApp.`}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </DialogContent>
                            </Dialog>
                            
                            <Button onClick={() => openDirections(pharmacy)} variant="outline" className="w-full">
                              <Navigation className="mr-2 h-4 w-4" /> Directions
                            </Button>
                            
                            <Button onClick={() => sendWhatsAppMessage(pharmacy)} variant="outline" className="w-full">
                              <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!isSearching && searchResults.length === 0 && hasSearched && (
                <div className="text-center py-16">
                  <AlertCircle className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No pharmacies found</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    {`We couldn't find any pharmacies with "${searchTerm}" in stock. Try searching for a different medicine or check back later.`}
                  </p>
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Popular alternatives:</h4>
                    <div className="flex flex-wrap justify-center gap-2">
                      {trendingSearches.filter(t => t !== searchTerm).slice(0, 3).map(term => (
                        <button
                          key={term}
                          onClick={() => handleQuickSearch(term)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}