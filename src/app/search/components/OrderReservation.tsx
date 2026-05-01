// app/search/components/OrderReservation.tsx
"use client"

import { useState } from "react"
import {
  Package,
  Phone,
  MessageCircle,
  Mail,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Calendar,
  User,
  MapPin,
  Pill,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Pharmacy {
  id: string
  name: string
  address: string
  phone: string
  whatsapp?: string
  distance: number
  quantity: number
  price: number
}

interface OrderReservationProps {
  pharmacy: Pharmacy
  medicineName: string
  medicineId: string
  onOrderPlaced?: () => void
}

export function OrderReservation({ pharmacy, medicineName, medicineId, onOrderPlaced }: OrderReservationProps) {
  const [step, setStep] = useState<"form" | "confirm" | "success">("form")
  const [loading, setLoading] = useState(false)
  const [orderData, setOrderData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    quantity: 1,
    notes: "",
    contactMethod: "whatsapp" as "whatsapp" | "call" | "sms",
  })
  const [orderId, setOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const maxQuantity = Math.min(pharmacy.quantity, 10) // Max 10 units per order

  const handlePlaceOrder = async () => {
    if (!orderData.customerName || !orderData.customerPhone) {
      setError("Please provide your name and phone number")
      return
    }

    if (orderData.quantity < 1 || orderData.quantity > maxQuantity) {
      setError(`Quantity must be between 1 and ${maxQuantity}`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pharmacyId: pharmacy.id,
          medicineId: medicineId,
          medicineName: medicineName,
          quantity: orderData.quantity,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          customerEmail: orderData.customerEmail,
          notes: orderData.notes,
          contactMethod: orderData.contactMethod,
          totalPrice: pharmacy.price * orderData.quantity,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to place order")
      }

      setOrderId(data.orderId)
      setStep("confirm")
      
      // Send confirmation message based on contact method
      await sendConfirmationMessage(data.orderId, orderData.contactMethod)
      
      if (onOrderPlaced) onOrderPlaced()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const sendConfirmationMessage = async (orderId: string, method: string) => {
    // This would integrate with your messaging service
    console.log(`Sending confirmation via ${method} for order ${orderId}`)
  }

  const handleContactPharmacy = () => {
    if (orderData.contactMethod === "whatsapp" && pharmacy.whatsapp) {
      const message = `Hello, I've placed an order (${orderId}) for ${medicineName}. Please confirm availability.`
      window.open(`https://wa.me/${pharmacy.whatsapp}?text=${encodeURIComponent(message)}`, "_blank")
    } else if (orderData.contactMethod === "call") {
      window.location.href = `tel:${pharmacy.phone}`
    }
  }

  const formatReservationTime = () => {
    const expiry = new Date()
    expiry.setMinutes(expiry.getMinutes() + 120) // 2 hours reservation
    return expiry.toLocaleTimeString()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white w-full">
          <Package className="h-4 w-4 mr-2" />
          Reserve & Order
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Reserve Medicine
          </DialogTitle>
          <DialogDescription>
            Reserve {medicineName} from {pharmacy.name} and collect at your convenience
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-6 py-4">
            {/* Pharmacy Info */}
            <div className="bg-emerald-50 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2">{pharmacy.name}</h3>
              <div className="space-y-1 text-sm text-slate-600">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  {pharmacy.address}
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  {pharmacy.phone}
                </div>
                {pharmacy.whatsapp && (
                  <div className="flex items-center">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp: {pharmacy.whatsapp}
                  </div>
                )}
              </div>
            </div>

            {/* Medicine Details */}
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center">
                    <Pill className="h-5 w-5 text-emerald-500 mr-2" />
                    <h4 className="font-semibold text-slate-900">{medicineName}</h4>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Price: MWK {pharmacy.price.toLocaleString()}
                  </p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700">
                  {pharmacy.quantity} in stock
                </Badge>
              </div>
            </div>

            {/* Order Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerName">Full Name *</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="customerName"
                    value={orderData.customerName}
                    onChange={(e) => setOrderData({ ...orderData, customerName: e.target.value })}
                    className="pl-10"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customerPhone">Phone Number *</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="customerPhone"
                    value={orderData.customerPhone}
                    onChange={(e) => setOrderData({ ...orderData, customerPhone: e.target.value })}
                    className="pl-10"
                    placeholder="+265 888 123 456"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customerEmail">Email (Optional)</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="customerEmail"
                    type="email"
                    value={orderData.customerEmail}
                    onChange={(e) => setOrderData({ ...orderData, customerEmail: e.target.value })}
                    className="pl-10"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={maxQuantity}
                  value={orderData.quantity}
                  onChange={(e) => setOrderData({ ...orderData, quantity: parseInt(e.target.value) || 1 })}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Maximum {maxQuantity} units available
                </p>
              </div>

              <div>
                <Label>Preferred Contact Method *</Label>
                <RadioGroup
                  value={orderData.contactMethod}
                  onValueChange={(value: string) => setOrderData({ ...orderData, contactMethod: value as "whatsapp" | "call" | "sms" })}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="whatsapp" id="whatsapp" />
                    <Label htmlFor="whatsapp" className="flex items-center">
                      <MessageCircle className="h-4 w-4 mr-1 text-green-600" />
                      WhatsApp
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="call" id="call" />
                    <Label htmlFor="call" className="flex items-center">
                      <Phone className="h-4 w-4 mr-1 text-blue-600" />
                      Phone Call
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sms" id="sms" />
                    <Label htmlFor="sms" className="flex items-center">
                      <MessageCircle className="h-4 w-4 mr-1 text-purple-600" />
                      SMS
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={orderData.notes}
                  onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                  placeholder="Any special instructions or questions for the pharmacy..."
                  rows={3}
                />
              </div>

              {/* Order Summary */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-2">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{medicineName} x {orderData.quantity}</span>
                    <span>MWK {(pharmacy.price * orderData.quantity).toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>MWK {(pharmacy.price * orderData.quantity).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing Order...
                  </>
                ) : (
                  "Place Order & Reserve"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Order Placed Successfully!</h3>
              <p className="text-slate-600">
                Your order has been submitted. Order ID: <span className="font-mono font-bold">{orderId}</span>
              </p>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                Your medicine will be reserved for 2 hours. Please contact the pharmacy to confirm availability.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900">Next Steps:</h4>
              <ol className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start">
                  <span className="bg-emerald-100 text-emerald-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
                  Contact the pharmacy to confirm your order
                </li>
                <li className="flex items-start">
                  <span className="bg-emerald-100 text-emerald-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
                  Pharmacy will reserve your medicine
                </li>
                <li className="flex items-start">
                  <span className="bg-emerald-100 text-emerald-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
                  Visit the pharmacy within 2 hours to collect
                </li>
                <li className="flex items-start">
                  <span className="bg-emerald-100 text-emerald-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">4</span>
                  Show your order ID and pay at the counter
                </li>
              </ol>
            </div>

            <Button
              onClick={handleContactPharmacy}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white"
            >
              {orderData.contactMethod === "whatsapp" && <MessageCircle className="h-4 w-4 mr-2" />}
              {orderData.contactMethod === "call" && <Phone className="h-4 w-4 mr-2" />}
              Contact Pharmacy Now
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setStep("success")
                setTimeout(() => {
                  // Close dialog after success
                  const closeButton = document.querySelector('[aria-label="Close"]') as HTMLButtonElement
                  if (closeButton) closeButton.click()
                }, 3000)
              }}
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}