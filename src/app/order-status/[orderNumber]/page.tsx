"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageCircle, Phone, MapPin } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface OrderDetails {
  id: string
  orderNumber: string
  status: string
  quantity: number
  totalPrice: number
  createdAt: string
  reservationExpiry: string
  pharmacy: {
    name: string
    location: string
    phone: string
    latitude: number
    longitude: number
  }
  medicine: { name: string }
  messages: { message: string; isFromPharmacy: boolean; createdAt: string }[]
}

export default function OrderStatusPage() {
  const params = useParams()
  const orderNumber = params.orderNumber as string
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrderStatus()
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchOrderStatus, 10000)
    return () => clearInterval(interval)
  }, [orderNumber])

  const fetchOrderStatus = async () => {
    try {
      const response = await fetch(`/api/public/order-status/${orderNumber}`)
      const data = await response.json()
      if (response.ok) {
        setOrder(data.order)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; description: string }> = {
      PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', description: 'Your order is awaiting pharmacy confirmation' },
      CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', description: 'Pharmacy has confirmed your order and reserved the medicine' },
      READY_FOR_COLLECTION: { label: 'Ready for Collection', color: 'bg-green-100 text-green-800', description: 'Your medicine is ready for pickup' },
      COLLECTED: { label: 'Collected', color: 'bg-gray-100 text-gray-800', description: 'You have collected your medicine' },
      CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', description: 'Your order has been cancelled' },
      EXPIRED: { label: 'Expired', color: 'bg-orange-100 text-orange-800', description: 'Reservation has expired' }
    }
    return statusMap[status] || { label: status, color: 'bg-gray-100', description: '' }
  }

  const contactPharmacy = () => {
    if (order?.pharmacy.phone) {
      window.open(`https://wa.me/${order.pharmacy.phone.replace(/[^0-9]/g, '')}?text=I have an order ${order.orderNumber}`)
    }
  }

  const getDirections = () => {
    if (order?.pharmacy.latitude && order?.pharmacy.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.pharmacy.latitude},${order.pharmacy.longitude}`)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading order details...</div>
  }

  if (!order) {
    return <div className="text-center py-12">Order not found</div>
  }

  const statusInfo = getStatusInfo(order.status)
  const isExpired = order.status === 'EXPIRED' || new Date(order.reservationExpiry) < new Date()

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Order #{order.orderNumber}</span>
              <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Timeline */}
            <div className="space-y-2">
              <p className="text-gray-600">{statusInfo.description}</p>
              {isExpired && order.status !== 'COLLECTED' && (
                <p className="text-red-600 text-sm">⚠️ This reservation has expired. Please contact the pharmacy.</p>
              )}
            </div>

            {/* Order Details */}
            <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Medicine</p>
                <p className="font-medium">{order.medicine.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Quantity</p>
                <p className="font-medium">{order.quantity}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Price</p>
                <p className="font-medium">MWK {order.totalPrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Order Date</p>
                <p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Pharmacy Information */}
            <div>
              <h3 className="font-semibold mb-3">Pharmacy Details</h3>
              <div className="space-y-2">
                <p><strong>{order.pharmacy.name}</strong></p>
                <p className="text-gray-600">{order.pharmacy.location}</p>
                <div className="flex gap-3 mt-3">
                  <Button onClick={getDirections} variant="outline">
                    <MapPin className="mr-2 h-4 w-4" /> Get Directions
                  </Button>
                  <Button onClick={contactPharmacy} variant="outline">
                    <MessageCircle className="mr-2 h-4 w-4" /> Contact Pharmacy
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            {order.messages.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Updates</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {order.messages.map((msg, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${msg.isFromPharmacy ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'}`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(msg.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reservation Expiry Warning */}
            {order.status === 'CONFIRMED' && !isExpired && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⏰ Please collect your medicine by {new Date(order.reservationExpiry).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}