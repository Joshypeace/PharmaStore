// app/dashboard/orders/page.tsx
"use client"

import { useState, useEffect } from "react"
import {
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  Search,
  Filter,
  ChevronDown,
  Eye,
  Check,
  Truck,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  quantity: number
  totalPrice: number
  status: string
  notes?: string
  reservationExpiry: string
  createdAt: string
  medicine: {
    name: string
  }
}

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchOrders()
    // Refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/pharmacy/orders")
      const data = await response.json()
      setOrders(data.orders)
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, status: string, notes?: string) => {
    setUpdating(true)
    try {
      const response = await fetch("/api/pharmacy/orders/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status, notes }),
      })

      if (response.ok) {
        await fetchOrders()
        setSelectedOrder(null)
      }
    } catch (error) {
      console.error("Failed to update order:", error)
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
      CONFIRMED: { label: "Confirmed", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
      READY_FOR_COLLECTION: { label: "Ready for Collection", color: "bg-purple-100 text-purple-700", icon: Package },
      COLLECTED: { label: "Collected", color: "bg-green-100 text-green-700", icon: UserCheck },
      CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
      EXPIRED: { label: "Expired", color: "bg-gray-100 text-gray-700", icon: Clock },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    const Icon = config.icon
    return (
      <Badge className={`${config.color} flex items-center gap-1 w-fit`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const filteredOrders = orders.filter(order => {
    if (filter !== "all" && order.status !== filter) return false
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        order.orderNumber.toLowerCase().includes(search) ||
        order.customerName.toLowerCase().includes(search) ||
        order.customerPhone.includes(search) ||
        order.medicine.name.toLowerCase().includes(search)
      )
    }
    return true
  })

  const getActionButtons = (order: Order) => {
    switch (order.status) {
      case "PENDING":
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => updateOrderStatus(order.id, "CONFIRMED", "Order confirmed by pharmacy")}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Check className="h-4 w-4 mr-1" />
              Confirm Order
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateOrderStatus(order.id, "CANCELLED", "Order cancelled by pharmacy")}
              className="text-red-600 hover:text-red-700"
            >
              Cancel
            </Button>
          </div>
        )
      case "CONFIRMED":
        return (
          <Button
            size="sm"
            onClick={() => updateOrderStatus(order.id, "READY_FOR_COLLECTION", "Medicine ready for collection")}
            className="bg-purple-500 hover:bg-purple-600"
          >
            <Package className="h-4 w-4 mr-1" />
            Mark as Ready
          </Button>
        )
      case "READY_FOR_COLLECTION":
        return (
          <Button
            size="sm"
            onClick={() => updateOrderStatus(order.id, "COLLECTED", "Order collected by customer")}
            className="bg-green-500 hover:bg-green-600"
          >
            <UserCheck className="h-4 w-4 mr-1" />
            Mark as Collected
          </Button>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Order Management</h1>
          <p className="text-slate-600">Manage customer orders and reservations</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search by order number, customer name, phone, or medicine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="READY_FOR_COLLECTION">Ready for Collection</SelectItem>
              <SelectItem value="COLLECTED">Collected</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No orders found</p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            Order #{order.orderNumber}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-sm text-slate-600">Customer</p>
                          <p className="font-medium">{order.customerName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span className="text-sm">{order.customerPhone}</span>
                          </div>
                          {order.customerEmail && (
                            <p className="text-sm text-slate-600">{order.customerEmail}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Medicine</p>
                          <p className="font-medium">{order.medicine.name}</p>
                          <p className="text-sm">Quantity: {order.quantity}</p>
                          <p className="text-sm font-semibold">
                            Total: MWK {order.totalPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="bg-slate-50 rounded p-2 mb-3">
                          <p className="text-sm text-slate-600">Notes: {order.notes}</p>
                        </div>
                      )}

                      <div className="flex items-center text-sm text-amber-600">
                        <Clock className="h-4 w-4 mr-1" />
                        Reservation expires: {new Date(order.reservationExpiry).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {getActionButtons(order)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Customer Information</p>
                  <div className="mt-2 space-y-1">
                    <p className="font-medium">{selectedOrder.customerName}</p>
                    <p className="text-sm">{selectedOrder.customerPhone}</p>
                    {selectedOrder.customerEmail && (
                      <p className="text-sm">{selectedOrder.customerEmail}</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Order Information</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm">Medicine: {selectedOrder.medicine.name}</p>
                    <p className="text-sm">Quantity: {selectedOrder.quantity}</p>
                    <p className="text-sm font-semibold">
                      Total: MWK {selectedOrder.totalPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-slate-600">Customer Notes</p>
                  <p className="text-sm mt-1 p-2 bg-slate-50 rounded">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-slate-600">Status History</p>
                <div className="mt-2 space-y-2">
                  <Badge className={getStatusBadge(selectedOrder.status).props.className}>
                    Current: {selectedOrder.status}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                {getActionButtons(selectedOrder)}
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = `tel:${selectedOrder.customerPhone}`
                  }}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call Customer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}