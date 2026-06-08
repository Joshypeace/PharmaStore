// app/orders/[orderNumber]/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  AlertCircle,
  Navigation,
  ArrowLeft
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/components/ui/use-toast'

interface OrderStatus {
  id: string
  orderNumber: string
  status: 'PENDING' | 'CONFIRMED' | 'READY_FOR_COLLECTION' | 'COLLECTED' | 'CANCELLED' | 'EXPIRED'
  medicineName: string
  quantity: number
  totalPrice: number
  reservationFee: number
  amountToPayAtPickup: number
  reservationExpiry: string
  createdAt: string
  pharmacy: {
    id: string
    name: string
    phone: string
    location: string
    latitude: number
    longitude: number
  }
  history: Array<{
    status: string
    notes: string
    changedAt: string
  }>
}

export default function OrderTrackingPage() {
  const params = useParams()
  const router = useRouter()
  const orderNumber = params.orderNumber as string
  
  const [order, setOrder] = useState<OrderStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  useEffect(() => {
    if (orderNumber) {
      fetchOrderStatus()
    }
  }, [orderNumber])

  // Poll for updates every 10 seconds
  useEffect(() => {
    if (!order) return
    
    const interval = setInterval(() => {
      fetchOrderStatus()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [order])

  // Update countdown timer
  useEffect(() => {
    if (!order?.reservationExpiry) return
    
    const updateTimer = () => {
      const expiry = new Date(order.reservationExpiry)
      const now = new Date()
      const diff = expiry.getTime() - now.getTime()
      
      if (diff <= 0) {
        setTimeRemaining('Expired')
        return
      }
      
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${remainingMinutes}m`)
      } else {
        setTimeRemaining(`${minutes} minutes`)
      }
    }
    
    updateTimer()
    const interval = setInterval(updateTimer, 60000)
    return () => clearInterval(interval)
  }, [order?.reservationExpiry])

  const fetchOrderStatus = async () => {
    try {
      const response = await fetch(`/api/public/order-status?orderNumber=${orderNumber}`)
      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error)
      
      setOrder(data.order)
    } catch (err) {
      console.error('Error fetching order:', err)
      setError('Failed to load order status')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-8 w-8 text-yellow-500" />
      case 'CONFIRMED':
        return <CheckCircle className="h-8 w-8 text-blue-500" />
      case 'READY_FOR_COLLECTION':
        return <Package className="h-8 w-8 text-purple-500" />
      case 'COLLECTED':
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case 'CANCELLED':
        return <XCircle className="h-8 w-8 text-red-500" />
      case 'EXPIRED':
        return <AlertCircle className="h-8 w-8 text-orange-500" />
      default:
        return <Package className="h-8 w-8 text-gray-500" />
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Waiting for pharmacy to confirm your order'
      case 'CONFIRMED':
        return 'Order confirmed! Medicine reserved for you'
      case 'READY_FOR_COLLECTION':
        return 'Your medicine is ready for pickup!'
      case 'COLLECTED':
        return 'Order completed. Thank you for shopping with us!'
      case 'CANCELLED':
        return 'Order has been cancelled'
      case 'EXPIRED':
        return 'Reservation has expired'
      default:
        return 'Processing your order'
    }
  }

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'PENDING': return 25
      case 'CONFIRMED': return 50
      case 'READY_FOR_COLLECTION': return 75
      case 'COLLECTED': return 100
      default: return 0
    }
  }

  const getDirections = () => {
    if (order?.pharmacy) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.pharmacy.latitude},${order.pharmacy.longitude}`)
    }
  }

  const callPharmacy = () => {
    if (order?.pharmacy?.phone) {
      window.location.href = `tel:${order.pharmacy.phone}`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
              <p className="text-slate-600 mb-6">{error || "We couldn't find your order"}</p>
              <Button onClick={() => router.push('/')} className="bg-emerald-600">
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Order Status</h1>
          <p className="text-slate-600 mt-1">Order #{order.orderNumber}</p>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(order.status)}
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {order.status.replace('_', ' ')}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {getStatusMessage(order.status)}
                  </p>
                </div>
              </div>
              {order.status === 'PENDING' && (
                <Badge variant="outline" className="text-yellow-600">
                  Awaiting Confirmation
                </Badge>
              )}
              {order.status === 'READY_FOR_COLLECTION' && (
                <Badge className="bg-green-100 text-green-700">
                  Ready for Pickup
                </Badge>
              )}
            </div>

            {/* Progress Bar */}
            <Progress value={getStatusProgress(order.status)} className="h-2 mb-4" />

            {/* Timer for active orders */}
            {(order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'READY_FOR_COLLECTION') && (
              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg mb-4">
                <Clock className="h-4 w-4" />
                <span>
                  {order.status === 'READY_FOR_COLLECTION' 
                    ? `Pick up within ${timeRemaining}`
                    : `Reservation expires in ${timeRemaining}`
                  }
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-slate-900 mb-4">Order Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Medicine</span>
                <span className="font-medium">{order.medicineName} x {order.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Order Date</span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span>MWK {order.totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Reservation Fee</span>
                <span className="text-emerald-600">- MWK {order.reservationFee.toLocaleString()}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold">
                <span>Pay at Pickup</span>
                <span className="text-emerald-600">MWK {order.amountToPayAtPickup.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pharmacy Info */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-slate-900 mb-4">Pharmacy Information</h3>
            <div className="space-y-3">
              <div>
                <p className="font-medium">{order.pharmacy.name}</p>
                <div className="flex items-start gap-2 text-sm text-slate-600 mt-1">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{order.pharmacy.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                  <Phone className="h-4 w-4" />
                  <span>{order.pharmacy.phone}</span>
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button onClick={getDirections} variant="outline" className="flex-1">
                  <Navigation className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
                <Button onClick={callPharmacy} variant="outline" className="flex-1">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Pharmacy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order History */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-slate-900 mb-4">Order Timeline</h3>
            <div className="space-y-4">
              {order.history.map((event, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500"></div>
                    {index < order.history.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 ml-0.5 mt-2"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-medium text-slate-900">
                      {event.status.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-slate-600">{event.notes}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(event.changedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons for Ready Orders */}
        {order.status === 'READY_FOR_COLLECTION' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
            <div className="max-w-2xl mx-auto">
              <Button 
                onClick={getDirections}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-6"
              >
                <Navigation className="h-5 w-5 mr-2" />
                Navigate to Pharmacy Now
              </Button>
              <p className="text-xs text-center text-slate-500 mt-2">
                Please bring your order number: {order.orderNumber}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}