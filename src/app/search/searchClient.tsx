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
  MessageSquare,
  User,
  LogOut,
  History,
  Home
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PublicAuthModal } from '@/components/publicAuthModal'

interface Pharmacy {
  id: string
  name: string
  location: string
  latitude: number
  longitude: number
  phone: string
  email: string
  inventoryItemId: string
  medicineId?: string
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

interface PublicUser {
  id: string
  name: string
  phoneNumber: string
  email: string | null
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
  
  // Auth state
  const [publicUser, setPublicUser] = useState<PublicUser | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<{ pharmacy: Pharmacy; medicineName: string } | null>(null)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  
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
  const [orderSuccess, setOrderSuccess] = useState<{ orderNumber: string; message: string; amountToPayAtPickup: number } | null>(null)

  // Check for existing session on mount
  useEffect(() => {
    const sessionToken = localStorage.getItem("publicSessionToken")
    const user = localStorage.getItem("publicUser")
    if (sessionToken && user) {
      try {
        setPublicUser(JSON.parse(user))
      } catch (e) {
        console.error("Failed to parse user data")
      }
    }
  }, [])

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

  // Handle successful login/registration
  const handleAuthSuccess = (user: PublicUser, sessionToken: string) => {
    setPublicUser(user)
    setShowAuthModal(false)
    
    // If there's a pending order, proceed with it
    if (pendingOrder) {
      setSelectedPharmacy(pendingOrder.pharmacy)
      setOrderForm({ 
        customerName: user.name,
        customerPhone: user.phoneNumber,
        customerEmail: user.email || '', 
        quantity: 1, 
        notes: '' 
      })
      setOrderSuccess(null)
      setPendingOrder(null)
      setIsOrderDialogOpen(true)
    }
  }

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("publicSessionToken")
    localStorage.removeItem("publicUser")
    setPublicUser(null)
    toast({ title: "Logged Out", description: "You have been logged out successfully" })
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
    let conversation = conversations.find(c => c.pharmacyId === pharmacy.id)
    
    if (!conversation) {
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

  const handleOrderClick = (pharmacy: Pharmacy) => {
    if (!publicUser) {
      setPendingOrder({ pharmacy, medicineName: searchTerm })
      setShowAuthModal(true)
      return
    }
    
    setSelectedPharmacy(pharmacy)
    setOrderForm({ 
      customerName: publicUser.name,
      customerPhone: publicUser.phoneNumber,
      customerEmail: publicUser.email || '', 
      quantity: 1, 
      notes: '' 
    })
    setOrderSuccess(null)
    setIsOrderDialogOpen(true)
  }

  const placeOrder = async () => {
    if (!selectedPharmacy || !publicUser) {
      toast({ title: 'Error', description: 'Please login to place an order', variant: 'destructive' })
      return
    }

    if (!selectedPharmacy.inventoryItemId) {
      toast({ title: 'Error', description: 'Invalid pharmacy selection. Please search again.', variant: 'destructive' })
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
          userId: publicUser.id,
          pharmacyId: selectedPharmacy.id,
          inventoryItemId: selectedPharmacy.inventoryItemId,
          medicineId: selectedPharmacy.medicineId,
          medicineName: searchTerm,
          quantity: orderForm.quantity,
          notes: orderForm.notes
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setOrderSuccess({
        orderNumber: data.order.orderNumber,
        message: data.message,
        amountToPayAtPickup: data.order.amountToPayAtPickup
      })
      
      toast({
        title: 'Order Placed!',
        description: `Your order #${data.order.orderNumber} has been placed successfully.`
      })
      
      if (userLocation) {
        await searchMedicine(searchTerm, userLocation)
      }
      
    } catch (error) {
      console.error('Order error:', error)
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to place order', variant: 'destructive' })
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const openDirections = (pharmacy: Pharmacy) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`)
  }

  const closeOrderDialog = () => {
    setIsOrderDialogOpen(false)
    setSelectedPharmacy(null)
    setOrderSuccess(null)
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!publicUser) return '?'
    return publicUser.name.charAt(0).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Pill className="h-8 w-8" />
                <h1 className="text-2xl font-bold">Medicine Finder</h1>
              </div>
              
              {/* User Menu with Dropdown */}
              {publicUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="hover:bg-white/20 rounded-full">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 bg-white/20">
                          <AvatarFallback className="text-white bg-transparent">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium hidden sm:inline">{publicUser.name.split(' ')[0]}</span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span>{publicUser.name}</span>
                        <span className="text-xs text-gray-500">{publicUser.phoneNumber}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/orders/public-orders')} className="cursor-pointer">
                      <History className="mr-2 h-4 w-4" />
                      <span>My Orders</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/')} className="cursor-pointer">
                      <Home className="mr-2 h-4 w-4" />
                      <span>Home</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="ghost" 
                  onClick={() => setShowAuthModal(true)}
                  className="text-white hover:bg-white/20"
                >
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              )}
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

      {/* Auth Modal */}
      <PublicAuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false)
          setPendingOrder(null)
        }}
        onSuccess={handleAuthSuccess}
      />

      {/* Order Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={closeOrderDialog}>
        <DialogContent className="sm:max-w-md">
          {orderSuccess ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Order Placed!</h3>
              <p className="text-gray-600 mb-2">Order #{orderSuccess.orderNumber}</p>
              <p className="text-sm text-gray-500 mb-4">{orderSuccess.message}</p>
              
              <div className="bg-emerald-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-gray-600">Amount to pay at pickup:</p>
                <p className="text-xl font-bold text-emerald-600">MWK {orderSuccess.amountToPayAtPickup.toLocaleString()}</p>
              </div>
              
              <Button 
                onClick={() => {
                  closeOrderDialog()
                  router.push(`/orders/${orderSuccess.orderNumber}`)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 mb-3 w-full"
              >
                <Package className="h-4 w-4 mr-2" />
                Track Order Status
              </Button>
              
              <Button variant="outline" onClick={closeOrderDialog} className="mt-3 w-full">
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
                  <p className="text-xs text-emerald-600 mt-2">
                    Reservation fee: MWK 500 (deducted from total at pickup)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Your Name *</Label>
                  <Input
                    value={orderForm.customerName}
                    onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                    placeholder="Full name"
                    disabled={!!publicUser}
                  />
                  {publicUser && (
                    <p className="text-xs text-green-600">Using your account name</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    value={orderForm.customerPhone}
                    onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })}
                    placeholder="Phone number for updates"
                    disabled={!!publicUser}
                  />
                  {publicUser && (
                    <p className="text-xs text-green-600">Using your account phone</p>
                  )}
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
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">MWK {((selectedPharmacy?.price || 0) * orderForm.quantity).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Reservation fee:</span>
                    <span className="font-medium text-emerald-600">MWK 500</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Pay at pickup:</span>
                    <span className="text-emerald-700">
                      MWK {(((selectedPharmacy?.price || 0) * orderForm.quantity) - 500).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <Button onClick={placeOrder} disabled={isPlacingOrder} className="w-full">
                  {isPlacingOrder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isPlacingOrder ? 'Placing Order...' : 'Place Order & Reserve'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content - Keep your existing results section */}
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
          
          {/* Empty State */}
          {!hasSearched && (
            <div className="flex flex-col items-center justify-center py-12">
              {/* Your existing SVG here - keeping it to save space */}
              <div className="text-center">
                <p className="text-gray-500 mt-4">Search for a medicine to find nearby pharmacies</p>
              </div>
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
          
          {/* Results Section - Keep your existing results rendering */}
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
                      {/* Your existing pharmacy card content */}
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{pharmacy.name}</h3>
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

                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <Button 
                            onClick={() => handleOrderClick(pharmacy)} 
                            className="bg-emerald-600 hover:bg-emerald-700 w-full"
                          >
                            Order Now
                          </Button>
                          
                          <Button onClick={() => openDirections(pharmacy)} variant="outline" className="w-full">
                            <Navigation className="mr-2 h-4 w-4" /> Directions
                          </Button>
                          
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
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}