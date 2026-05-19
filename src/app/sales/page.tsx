"use client"

import { useState, useEffect } from 'react'
import { Search, Plus, Minus, ShoppingCart, CreditCard, Smartphone, Receipt, Package, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import { toast } from '@/components/ui/use-toast'

interface Medicine {
  id: string
  name: string
  price: number
  quantity: number
  expiryDate?: string | null
  batch?: string | null
  category: string
  status?: string
}

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  total: number
}

export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [availableMedicines, setAvailableMedicines] = useState<Medicine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch medicines from the backend
  useEffect(() => {
    fetchMedicines()
  }, [])

  const fetchMedicines = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/inventory')
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched inventory:', data) // Debug log
        
        // Map the response correctly - handle both field name variations
        const medicinesWithDefaults = data.map((item: any) => ({
          id: item.id,
          name: item.name || item.medicine || item.medicineName || 'Unknown Medicine',
          price: item.price || 0,
          quantity: item.quantity || 0,
          expiryDate: item.expiry || item.expiryDate || null,
          batch: item.batch || null,
          category: item.category || 'Uncategorized',
          status: item.status || 'In Stock'
        }))
        
        setAvailableMedicines(medicinesWithDefaults)
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch medicines:', errorData)
        toast({ title: 'Error', description: 'Failed to load inventory', variant: 'destructive' })
        setAvailableMedicines([])
      }
    } catch (error) {
      console.error('Error fetching medicines:', error)
      toast({ title: 'Error', description: 'Failed to connect to server', variant: 'destructive' })
      setAvailableMedicines([])
    } finally {
      setIsLoading(false)
    }
  }

  const addToCart = (medicine: Medicine) => {
    // Check if there's enough stock
    if (medicine.quantity <= 0) {
      toast({ title: 'Out of Stock', description: `${medicine.name} is out of stock`, variant: 'destructive' })
      return
    }

    const existingItem = cart.find(item => item.id === medicine.id)
    
    if (existingItem) {
      // Check if we're not exceeding available stock
      if (existingItem.quantity + 1 > medicine.quantity) {
        toast({ title: 'Stock Limit', description: `Only ${medicine.quantity} units available`, variant: 'destructive' })
        return
      }
      
      setCart(cart.map(item =>
        item.id === medicine.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ))
    } else {
      setCart([...cart, {
        id: medicine.id,
        name: medicine.name,
        price: medicine.price,
        quantity: 1,
        total: medicine.price
      }])
    }
    
    toast({ title: 'Added to Cart', description: `${medicine.name} added to cart` })
  }

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart(cart.filter(item => item.id !== id))
    } else {
      // Check if we're not exceeding available stock
      const medicine = availableMedicines.find(m => m.id === id)
      
      if (medicine && newQuantity > medicine.quantity) {
        toast({ title: 'Stock Limit', description: `Only ${medicine.quantity} units available`, variant: 'destructive' })
        return
      }
      
      setCart(cart.map(item =>
        item.id === id
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      ))
    }
  }

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + item.total, 0)
  }

  const processTransaction = async () => {
    if (cart.length === 0) {
      toast({ title: 'Cart Empty', description: 'Please add items to process transaction', variant: 'destructive' })
      return
    }

    setIsProcessing(true)
    
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.total
          })),
          paymentMethod,
          total: getTotalAmount(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh inventory to get updated stock levels
        await fetchMedicines()
        setIsReceiptModalOpen(true)
        toast({ title: 'Success', description: 'Sale completed successfully!' })
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to process transaction', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error processing transaction:', error)
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' })
    } finally {
      setIsProcessing(false)
    }
  }

  const clearCart = () => {
    setCart([])
    toast({ title: 'Cart Cleared', description: 'All items removed from cart' })
  }

  const handleReceiptClose = () => {
    setIsReceiptModalOpen(false)
    setCart([])
  }

  // Filter medicines based on search term
  const filteredMedicines = availableMedicines.filter(medicine =>
    medicine.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading Sales...</p>
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
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales & Dispensing</h1>
            <p className="text-gray-600">Process sales and dispense medications to customers</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Medicine Selection */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Available Medicines</CardTitle>
                  <CardDescription>Search and add medicines to cart</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by medicine name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {filteredMedicines.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No medicines found</p>
                      <p className="text-sm">Try a different search term or add medicines to inventory</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredMedicines.map((medicine) => (
                        <div
                          key={medicine.id}
                          className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => addToCart(medicine)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-gray-900">{medicine.name}</h3>
                            <Badge variant={medicine.quantity < 10 ? "destructive" : "secondary"}>
                              {medicine.quantity} left
                            </Badge>
                          </div>
                          <p className="text-lg font-bold text-emerald-600">
                            MWK {medicine.price.toLocaleString()}
                          </p>
                          {medicine.expiryDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              Expires: {new Date(medicine.expiryDate).toLocaleDateString()}
                            </p>
                          )}
                          <Button
                            size="sm"
                            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(medicine)
                            }}
                            disabled={medicine.quantity === 0}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            {medicine.quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Shopping Cart */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Shopping Cart
                    {cart.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-red-600 hover:text-red-700"
                        onClick={clearCart}
                      >
                        Clear All
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>{cart.length} item(s) in cart</CardDescription>
                </CardHeader>
                <CardContent>
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Cart is empty</p>
                      <p className="text-sm">Add medicines to start a sale</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                        {cart.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-sm text-gray-500">MWK {item.price.toLocaleString()} each</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-4 space-y-4">
                        <div className="flex justify-between items-center text-lg font-bold">
                          <span>Total:</span>
                          <span className="text-emerald-600">MWK {getTotalAmount().toLocaleString()}</span>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Payment Method</label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">
                                <div className="flex items-center">
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Cash
                                </div>
                              </SelectItem>
                              <SelectItem value="airtel">
                                <div className="flex items-center">
                                  <Smartphone className="mr-2 h-4 w-4" />
                                  Airtel Money
                                </div>
                              </SelectItem>
                              <SelectItem value="tnm">
                                <div className="flex items-center">
                                  <Smartphone className="mr-2 h-4 w-4" />
                                  TNM Mpamba
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                          onClick={processTransaction}
                          disabled={cart.length === 0 || isProcessing}
                        >
                          {isProcessing ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </div>
                          ) : (
                            <>
                              <Receipt className="mr-2 h-4 w-4" />
                              Complete Sale
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Receipt Modal */}
          <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Transaction Complete</DialogTitle>
                <DialogDescription>
                  Sale processed successfully. Receipt generated below.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="bg-white p-6 border rounded-lg">
                  <div className="text-center mb-4">
                    <h3 className="font-bold text-lg">PharmaStore Pharmacy</h3>
                    <p className="text-sm text-gray-600">Lilongwe, Malawi</p>
                    <p className="text-sm text-gray-600">Receipt #: RCP-{Date.now().toString().slice(-6)}</p>
                    <p className="text-sm text-gray-600">{new Date().toLocaleString()}</p>
                  </div>
                  
                  <div className="border-t border-b py-4 mb-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm mb-2">
                        <span>{item.name} x{item.quantity}</span>
                        <span>MWK {item.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between font-bold mb-2">
                    <span>Total:</span>
                    <span>MWK {getTotalAmount().toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm mb-4">
                    <span>Payment Method:</span>
                    <span className="capitalize">{paymentMethod}</span>
                  </div>

                  <div className="text-center text-xs text-gray-500">
                    <p>Thank you for your purchase!</p>
                    <p>Please come again</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReceiptClose}>
                  Close
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => window.print()}>
                  Print Receipt
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}