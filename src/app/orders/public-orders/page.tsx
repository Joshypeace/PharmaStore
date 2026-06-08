// app/orders/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Clock, MapPin, ChevronRight, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Order {
  id: string
  orderNumber: string
  medicineName: string
  quantity: number
  totalPrice: number
  status: string
  createdAt: string
  pharmacy: {
    name: string
  }
}

export default function MyOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const sessionToken = localStorage.getItem("publicSessionToken")
      const user = localStorage.getItem("publicUser")
      
      if (!sessionToken || !user) {
        router.push('/')
        return
      }
      
      const userData = JSON.parse(user)
      const response = await fetch(`/api/public/my-orders?userId=${userData.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setOrders(data.orders)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
      CONFIRMED: { label: 'Confirmed', className: 'bg-blue-100 text-blue-700' },
      READY_FOR_COLLECTION: { label: 'Ready for Pickup', className: 'bg-purple-100 text-purple-700' },
      COLLECTED: { label: 'Collected', className: 'bg-green-100 text-green-700' },
      CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
      EXPIRED: { label: 'Expired', className: 'bg-gray-100 text-gray-700' },
    }
    const config = statusConfig[status] || statusConfig.PENDING
    return <Badge className={config.className}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <Package className="h-8 w-8 text-emerald-600" />
          <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">You haven't placed any orders yet</p>
              <Button onClick={() => router.push('/')} className="mt-4 bg-emerald-600">
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card 
                key={order.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/orders/${order.orderNumber}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
                      <p className="font-semibold text-slate-900">{order.medicineName}</p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="space-y-1">
                      <p className="text-gray-600">Quantity: {order.quantity}</p>
                      <p className="text-gray-600">Total: MWK {order.totalPrice.toLocaleString()}</p>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{order.pharmacy.name}</span>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}