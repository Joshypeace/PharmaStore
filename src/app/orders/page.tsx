"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { Clock, CheckCircle, XCircle, Package, MessageCircle, Phone } from 'lucide-react'
import { JSX } from 'react/jsx-runtime'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  status: 'PENDING' | 'CONFIRMED' | 'READY_FOR_COLLECTION' | 'COLLECTED' | 'CANCELLED' | 'EXPIRED'
  quantity: number
  totalPrice: number
  notes: string | null
  createdAt: string
  reservationExpiry: string
  medicine: { name: string }
  messages: { id: string; message: string; isFromCustomer: boolean; createdAt: string }[]
}

export default function PharmacyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [replyMessage, setReplyMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showMessageDialog, setShowMessageDialog] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
    // Poll for new orders every 30 seconds
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
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

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const response = await fetch('/api/orders/update-order-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status })
      })
      
      if (!response.ok) throw new Error('Failed to update status')
      
      toast({ title: 'Status Updated', description: `Order status changed to ${status}` })
      fetchOrders()
      
      // If status is COLLECTED, update inventory
      if (status === 'COLLECTED') {
        await updateInventoryAfterCollection(orderId)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast({ title: 'Error', description: 'Failed to update order status', variant: 'destructive' })
    }
  }

  const updateInventoryAfterCollection = async (orderId: string) => {
    try {
      const response = await fetch('/api/orders/deduct-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })
      
      if (!response.ok) throw new Error('Failed to update inventory')
      
      toast({ title: 'Inventory Updated', description: 'Stock has been deducted' })
    } catch (error) {
      console.error('Error updating inventory:', error)
    }
  }

  const sendMessage = async (orderId: string, message: string) => {
    if (!message.trim()) return
    
    setSendingMessage(true)
    try {
      const response = await fetch('/api/send-order-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, message })
      })
      
      if (!response.ok) throw new Error('Failed to send message')
      
      toast({ title: 'Message Sent', description: 'Customer has been notified' })
      setReplyMessage('')
      setShowMessageDialog(null)
      fetchOrders()
    } catch (error) {
      console.error('Error sending message:', error)
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' })
    } finally {
      setSendingMessage(false)
    }
  }

  const getStatusBadge = (status: Order['status']) => {
    const badges: Record<Order['status'], JSX.Element> = {
      PENDING: <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>,
      CONFIRMED: <Badge className="bg-blue-100 text-blue-800">Confirmed</Badge>,
      READY_FOR_COLLECTION: <Badge className="bg-green-100 text-green-800">Ready for Collection</Badge>,
      COLLECTED: <Badge className="bg-gray-100 text-gray-800">Collected</Badge>,
      CANCELLED: <Badge className="bg-red-100 text-red-800">Cancelled</Badge>,
      EXPIRED: <Badge className="bg-orange-100 text-orange-800">Expired</Badge>
    }
    return badges[status]
  }

  const pendingOrders = orders.filter(o => o.status === 'PENDING')
  const activeOrders = orders.filter(o => ['CONFIRMED', 'READY_FOR_COLLECTION'].includes(o.status))
  const completedOrders = orders.filter(o => ['COLLECTED', 'CANCELLED', 'EXPIRED'].includes(o.status))

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading orders...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          <div className="container mx-auto px-0 sm:px-4 py-4 sm:py-8">
            <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Order Management</h1>
            
            {/* Responsive Tabs - Horizontal scroll on mobile */}
            <div className="overflow-x-auto pb-2 mb-4 sm:mb-6">
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
                  <TabsTrigger value="pending" className="text-xs sm:text-sm px-3 sm:px-4">
                    Pending ({pendingOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="active" className="text-xs sm:text-sm px-3 sm:px-4">
                    Active ({activeOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="text-xs sm:text-sm px-3 sm:px-4">
                    Completed ({completedOrders.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4 mt-4">
                  {pendingOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      getStatusBadge={getStatusBadge}
                      updateOrderStatus={updateOrderStatus}
                      sendMessage={sendMessage}
                      replyMessage={replyMessage}
                      setReplyMessage={setReplyMessage}
                      sendingMessage={sendingMessage}
                      showMessageDialog={showMessageDialog}
                      setShowMessageDialog={setShowMessageDialog}
                    />
                  ))}
                  {pendingOrders.length === 0 && (
                    <p className="text-gray-500 text-center py-8 text-sm sm:text-base">No pending orders</p>
                  )}
                </TabsContent>

                <TabsContent value="active" className="space-y-4 mt-4">
                  {activeOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      getStatusBadge={getStatusBadge}
                      updateOrderStatus={updateOrderStatus}
                      sendMessage={sendMessage}
                      replyMessage={replyMessage}
                      setReplyMessage={setReplyMessage}
                      sendingMessage={sendingMessage}
                      showMessageDialog={showMessageDialog}
                      setShowMessageDialog={setShowMessageDialog}
                    />
                  ))}
                  {activeOrders.length === 0 && (
                    <p className="text-gray-500 text-center py-8 text-sm sm:text-base">No active orders</p>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4 mt-4">
                  {completedOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      getStatusBadge={getStatusBadge}
                      updateOrderStatus={updateOrderStatus}
                      sendMessage={sendMessage}
                      replyMessage={replyMessage}
                      setReplyMessage={setReplyMessage}
                      sendingMessage={sendingMessage}
                      showMessageDialog={showMessageDialog}
                      setShowMessageDialog={setShowMessageDialog}
                    />
                  ))}
                  {completedOrders.length === 0 && (
                    <p className="text-gray-500 text-center py-8 text-sm sm:text-base">No completed orders</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// Separate component for order card
function OrderCard({ 
  order, 
  getStatusBadge, 
  updateOrderStatus, 
  sendMessage,
  replyMessage,
  setReplyMessage,
  sendingMessage,
  showMessageDialog,
  setShowMessageDialog
}: { 
  order: Order
  getStatusBadge: (status: Order['status']) => JSX.Element
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>
  sendMessage: (id: string, message: string) => Promise<void>
  replyMessage: string
  setReplyMessage: (message: string) => void
  sendingMessage: boolean
  showMessageDialog: string | null
  setShowMessageDialog: (id: string | null) => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-base sm:text-lg font-semibold">{order.orderNumber}</span>
            <div className="text-xs sm:text-sm text-gray-500 mt-1">{order.medicine.name}</div>
          </div>
          <div className="sm:ml-auto">
            {getStatusBadge(order.status)}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        {/* Responsive Grid - 1 column on mobile, 2 on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column */}
          <div className="space-y-2 text-sm sm:text-base">
            <p><strong>Customer:</strong> <span className="break-words">{order.customerName}</span></p>
            <p><strong>Phone:</strong> <span className="break-words">{order.customerPhone}</span></p>
            <p><strong>Email:</strong> <span className="break-words">{order.customerEmail || 'N/A'}</span></p>
            <p><strong>Quantity:</strong> {order.quantity}</p>
            <p><strong>Total Price:</strong> <span className="font-semibold text-emerald-600">MWK {order.totalPrice.toLocaleString()}</span></p>
            <p><strong>Ordered:</strong> <span className="text-sm">{new Date(order.createdAt).toLocaleString()}</span></p>
            {order.notes && (
              <div>
                <strong>Notes:</strong>
                <p className="text-sm text-gray-600 mt-1 break-words">{order.notes}</p>
              </div>
            )}
          </div>
          
          {/* Right Column */}
          <div className="space-y-3">
            <p className="text-sm">
              <strong>Reservation Expires:</strong> <br className="block sm:hidden" />
              <span className="text-sm text-orange-600">{new Date(order.reservationExpiry).toLocaleString()}</span>
            </p>
            
            {/* Order messages */}
            {order.messages && order.messages.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs sm:text-sm font-medium mb-2">Recent Messages:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {order.messages.slice(0, 3).map((msg, idx) => (
                    <p key={idx} className="text-xs text-gray-600 break-words">
                      <span className="font-medium">{msg.isFromCustomer ? 'Customer:' : 'Pharmacy:'}</span> {msg.message}
                    </p>
                  ))}
                </div>
              </div>
            )}
            
            {/* Action Buttons - Responsive wrap */}
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              {order.status === 'PENDING' && (
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Button 
                    onClick={() => updateOrderStatus(order.id, 'CONFIRMED')} 
                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm"
                    size="sm"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Confirm Order
                  </Button>
                  <Button 
                    onClick={() => updateOrderStatus(order.id, 'CANCELLED')} 
                    variant="destructive"
                    className="w-full sm:w-auto text-sm"
                    size="sm"
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                </div>
              )}
              {order.status === 'CONFIRMED' && (
                <Button 
                  onClick={() => updateOrderStatus(order.id, 'READY_FOR_COLLECTION')} 
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm"
                  size="sm"
                >
                  <Package className="mr-2 h-4 w-4" /> Mark Ready
                </Button>
              )}
              {order.status === 'READY_FOR_COLLECTION' && (
                <Button 
                  onClick={() => updateOrderStatus(order.id, 'COLLECTED')} 
                  className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto text-sm"
                  size="sm"
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Mark Collected
                </Button>
              )}
            </div>
            
            {/* Communication Buttons - Responsive grid */}
            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => window.open(`tel:${order.customerPhone}`)}
                className="w-full text-sm"
                size="sm"
              >
                <Phone className="mr-2 h-4 w-4" /> Call
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open(`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}?text=Your order ${order.orderNumber} is ${order.status}`)}
                className="w-full text-sm"
                size="sm"
              >
                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
              </Button>
              <Dialog 
                open={showMessageDialog === order.id} 
                onOpenChange={(open) => setShowMessageDialog(open ? order.id : null)}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full text-sm" size="sm">
                    <MessageCircle className="mr-2 h-4 w-4" /> Message
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95%] sm:max-w-[425px] rounded-lg mx-auto">
                  <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg">Send Message to Customer</DialogTitle>
                  </DialogHeader>
                  <Textarea
                    placeholder="Type your message here..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={4}
                    className="text-sm"
                  />
                  <Button 
                    onClick={() => sendMessage(order.id, replyMessage)} 
                    disabled={sendingMessage}
                    className="mt-2 w-full sm:w-auto"
                  >
                    {sendingMessage ? 'Sending...' : 'Send Message'}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}