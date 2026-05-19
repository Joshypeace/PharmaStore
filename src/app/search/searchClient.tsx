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
  TrendingUp,
  Phone,
  Mail,
  Star,
  Loader2,
  Package,
  WifiOff,
  Send,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'

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

interface Message {
  id: string
  text: string
  isFromUser: boolean
  timestamp: Date
}

interface Conversation {
  pharmacyId: string
  pharmacyName: string
  messages: Message[]
  lastMessageTime: Date
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
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  
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

  // Load conversations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pharmacyConversations')
    if (saved) {
      try {
        const convos = JSON.parse(saved)
        setConversations(convos.map((c: { pharmacyId: string; pharmacyName: string; messages: Message[]; lastMessageTime: string }) => ({
          ...c,
          lastMessageTime: new Date(c.lastMessageTime),
          messages: c.messages.map((m: Message) => ({
            ...m,
            timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : m.timestamp
          }))
        })))
      } catch (e) {}
    }
    
    const savedHistory = localStorage.getItem('medicineSearchHistory')
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory)
        setSearchHistory(history.slice(0, 5))
      } catch (e) {}
    }
  }, [])

  // Save conversations to localStorage
  const saveConversations = (conversations: Conversation[]) => {
    localStorage.setItem('pharmacyConversations', JSON.stringify(conversations))
  }

  // Save search to history
  const saveToHistory = (term: string) => {
    const newHistory = [{ term, timestamp: Date.now() }, ...searchHistory.filter(h => h.term !== term)].slice(0, 5)
    setSearchHistory(newHistory)
    localStorage.setItem('medicineSearchHistory', JSON.stringify(newHistory))
  }

  // Send message to pharmacy
  const sendMessageToPharmacy = async (pharmacyId: string, message: string) => {
    if (!message.trim()) return
    
    setSendingMessage(true)
    try {
      const response = await fetch('/api/public/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pharmacyId, message })
      })
      
      if (!response.ok) throw new Error('Failed to send message')
      
      const data = await response.json()
      
      // Update local conversation
      const updatedConversations = conversations.map(conv => {
        if (conv.pharmacyId === pharmacyId) {
          const newMessages = [...conv.messages, {
            id: data.messageId || Date.now().toString(),
            text: message,
            isFromUser: true,
            timestamp: new Date()
          }]
          return {
            ...conv,
            messages: newMessages,
            lastMessageTime: new Date()
          }
        }
        return conv
      })
      
      setConversations(updatedConversations)
      saveConversations(updatedConversations)
      
      // Update active conversation
      if (activeConversation?.pharmacyId === pharmacyId) {
        setActiveConversation({
          ...activeConversation,
          messages: [...activeConversation.messages, {
            id: data.messageId || Date.now().toString(),
            text: message,
            isFromUser: true,
            timestamp: new Date()
          }],
          lastMessageTime: new Date()
        })
      }
      
      toast({ title: 'Message Sent', description: 'Your message has been sent to the pharmacy' })
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' })
    } finally {
      setSendingMessage(false)
    }
  }

  // Open conversation with pharmacy
  const openConversation = async (pharmacy: Pharmacy) => {
    // Check if conversation exists
    let conversation = conversations.find(c => c.pharmacyId === pharmacy.id)
    
    if (!conversation) {
      // Create new conversation
      conversation = {
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.name,
        messages: [],
        lastMessageTime: new Date()
      }
      const updatedConversations = [...conversations, conversation]
      setConversations(updatedConversations)
      saveConversations(updatedConversations)
    }
    
    setActiveConversation(conversation)
    
    // Fetch message history from server
    try {
      const response = await fetch(`/api/public/get-messages?pharmacyId=${pharmacy.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.messages && data.messages.length > 0) {
          const updatedMessages = data.messages.map((msg: { id: string; message: string; isFromPharmacy: boolean; createdAt: string }) => ({
            id: msg.id,
            text: msg.message,
            isFromUser: !msg.isFromPharmacy,
            timestamp: new Date(msg.createdAt)
          }))
          
          const updatedConversation = {
            ...conversation,
            messages: updatedMessages,
            lastMessageTime: new Date()
          }
          
          setActiveConversation(updatedConversation)
          
          const updatedConversationsList = conversations.map(c => 
            c.pharmacyId === pharmacy.id ? updatedConversation : c
          )
          setConversations(updatedConversationsList)
          saveConversations(updatedConversationsList)
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
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
    setOrderForm({ 
      customerName: '', 
      customerPhone: '', 
      customerEmail: '', 
      quantity: 1, 
      notes: '' 
    })
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
          {/* Empty State — shown before first search */}
               {!hasSearched && (
                 <div className="flex flex-col items-center justify-center py-12">
                   <svg
                     width="100%"
                     viewBox="0 0 680 480"
                     role="img"
                     className="max-w-xl"
                     xmlns="http://www.w3.org/2000/svg"
                   >
                     <title>Medicine Finder</title>
                     <desc>Search for medicine to find nearby pharmacies</desc>
               
                     {/* Soft background blobs */}
                     <ellipse cx="200" cy="220" rx="160" ry="130" fill="#E1F5EE" opacity="0.5"/>
                     <ellipse cx="490" cy="260" rx="130" ry="110" fill="#E6F1FB" opacity="0.45"/>
                     <ellipse cx="340" cy="350" rx="100" ry="70" fill="#EEEDFE" opacity="0.35"/>
               
                     {/* Magnifying glass */}
                     <circle cx="300" cy="210" r="105" fill="none" stroke="#1D9E75" strokeWidth="10" strokeLinecap="round"/>
                     <circle cx="300" cy="210" r="84" fill="#E1F5EE" opacity="0.6"/>
                     <line x1="378" y1="288" x2="440" y2="355" stroke="#1D9E75" strokeWidth="12" strokeLinecap="round"/>
               
                     {/* Pill 1 */}
                     <g transform="translate(300,210) rotate(-30)">
                       <rect x="-46" y="-16" width="92" height="32" rx="16" fill="#0F6E56"/>
                       <rect x="-46" y="-16" width="46" height="32" rx="16" fill="#5DCAA5"/>
                       <line x1="0" y1="-16" x2="0" y2="16" stroke="#E1F5EE" strokeWidth="1.5"/>
                     </g>
               
                     {/* Pill 2 */}
                     <g transform="translate(260,170) rotate(40)">
                       <rect x="-28" y="-10" width="56" height="20" rx="10" fill="#185FA5"/>
                       <rect x="-28" y="-10" width="28" height="20" rx="10" fill="#85B7EB"/>
                       <line x1="0" y1="-10" x2="0" y2="10" stroke="#E6F1FB" strokeWidth="1"/>
                     </g>
               
                     {/* Pill 3 */}
                     <g transform="translate(330,245) rotate(-15)">
                       <rect x="-22" y="-9" width="44" height="18" rx="9" fill="#993C1D"/>
                       <rect x="-22" y="-9" width="22" height="18" rx="9" fill="#F0997B"/>
                       <line x1="0" y1="-9" x2="0" y2="9" stroke="#FAECE7" strokeWidth="1"/>
                     </g>
               
                     {/* Map pins */}
                     <g transform="translate(470,190)">
                       <path d="M0,-36 C-18,-36 -28,-22 -28,-10 C-28,14 0,36 0,36 C0,36 28,14 28,-10 C28,-22 18,-36 0,-36 Z" fill="#534AB7"/>
                       <circle cx="0" cy="-10" r="10" fill="#EEEDFE"/>
                     </g>
                     <g transform="translate(138,175)">
                       <path d="M0,-26 C-13,-26 -20,-16 -20,-7 C-20,10 0,26 0,26 C0,26 20,10 20,-7 C20,-16 13,-26 0,-26 Z" fill="#1D9E75"/>
                       <circle cx="0" cy="-7" r="7" fill="#E1F5EE"/>
                     </g>
               
                     {/* Dashed lines */}
                     <line x1="158" y1="175" x2="210" y2="180" stroke="#1D9E75" strokeWidth="1" strokeDasharray="4 3"/>
                     <line x1="453" y1="195" x2="390" y2="200" stroke="#534AB7" strokeWidth="1" strokeDasharray="4 3"/>
               
                     {/* Medicine cross */}
                     <g transform="translate(530,140)">
                       <rect x="-22" y="-8" width="44" height="16" rx="4" fill="#378ADD"/>
                       <rect x="-8" y="-22" width="16" height="44" rx="4" fill="#378ADD"/>
                       <rect x="-20" y="-6" width="40" height="12" rx="3" fill="#85B7EB"/>
                       <rect x="-6" y="-20" width="12" height="40" rx="3" fill="#85B7EB"/>
                     </g>
               
                     {/* Text */}
                     <text x="340" y="395" textAnchor="middle" fontSize="20" fontWeight="500" fill="#085041">Find your medicine nearby</text>
                     <text x="340" y="422" textAnchor="middle" fontSize="14" fill="#1D9E75">Search by name — Paracetamol, Amoxicillin, Metformin and more</text>
                     <text x="340" y="448" textAnchor="middle" fontSize="13" fill="#888780">We'll show nearby pharmacies with stock, prices, and directions</text>
                   </svg>
               
                   {/* Search history chips */}
                   {searchHistory.length > 0 && (
                     <div className="mt-6 text-center">
                       <p className="text-sm text-gray-500 mb-2 flex items-center justify-center gap-1">
                         <Clock className="h-3.5 w-3.5" /> Recent searches
                       </p>
                       <div className="flex flex-wrap justify-center gap-2">
                         {searchHistory.map(h => (
                           <button
                             key={h.term}
                             onClick={() => handleQuickSearch(h.term)}
                             className="px-3 py-1.5 bg-white border border-gray-200 hover:border-emerald-400 rounded-full text-sm text-gray-700 transition-colors"
                           >
                             {h.term}
                           </button>
                         ))}
                       </div>
                     </div>
                   )}
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

              <div className="grid gap-5">
                {searchResults.map((pharmacy, index) => (
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
                                        placeholder="Phone number for updates"
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
                                  </div>
                                </>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <Button onClick={() => openDirections(pharmacy)} variant="outline" className="w-full">
                            <Navigation className="mr-2 h-4 w-4" /> Directions
                          </Button>
                          
                          {/* In-App Message Button */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                onClick={() => openConversation(pharmacy)} 
                                variant="outline" 
                                className="w-full"
                              >
                                <MessageCircle className="mr-2 h-4 w-4" /> Message Pharmacy
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Chat with {activeConversation?.pharmacyName || pharmacy.name}</DialogTitle>
                              </DialogHeader>
                              <div className="flex flex-col h-[400px]">
                                <ScrollArea className="flex-1 pr-4">
                                  <div className="space-y-4">
                                    {activeConversation?.messages.map((msg) => (
                                      <div
                                        key={msg.id}
                                        className={`flex ${msg.isFromUser ? 'justify-end' : 'justify-start'}`}
                                      >
                                        <div
                                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                            msg.isFromUser
                                              ? 'bg-emerald-500 text-white'
                                              : 'bg-gray-100 text-gray-900'
                                          }`}
                                        >
                                          <p className="text-sm">{msg.text}</p>
                                          <p className={`text-xs mt-1 ${
                                            msg.isFromUser ? 'text-emerald-100' : 'text-gray-500'
                                          }`}>
                                            {msg.timestamp.toLocaleTimeString()}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                    {(!activeConversation?.messages || activeConversation.messages.length === 0) && (
                                      <div className="text-center text-gray-500 py-8">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                        <p>No messages yet</p>
                                        <p className="text-sm">Send a message to the pharmacy</p>
                                      </div>
                                    )}
                                  </div>
                                </ScrollArea>
                                <div className="flex gap-2 mt-4">
                                  <Input
                                    placeholder="Type your message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter' && !sendingMessage && newMessage.trim()) {
                                        sendMessageToPharmacy(pharmacy.id, newMessage)
                                      }
                                    }}
                                  />
                                  <Button
                                    onClick={() => sendMessageToPharmacy(pharmacy.id, newMessage)}
                                    disabled={sendingMessage || !newMessage.trim()}
                                    size="icon"
                                  >
                                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

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