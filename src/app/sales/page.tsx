"use client"

import { useState, useEffect } from 'react'
import { Search, Plus, Minus, ShoppingCart, CreditCard, Smartphone, Receipt, Package, AlertCircle, Trash2, CheckCircle, Clock } from 'lucide-react'
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
  const [selectedCategory, setSelectedCategory] = useState('all')

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
        console.log('Fetched inventory:', data)
        
        const medicinesWithDefaults = data.map((item: Partial<Medicine>) => ({
          id: item.id,
          name: item.name || 'Unknown Medicine',
          price: item.price || 0,
          quantity: item.quantity || 0,
          expiryDate: item.expiryDate || null,
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
    if (medicine.quantity <= 0) {
      toast({ title: 'Out of Stock', description: `${medicine.name} is out of stock`, variant: 'destructive' })
      return
    }

    const existingItem = cart.find(item => item.id === medicine.id)
    
    if (existingItem) {
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

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id))
    toast({ title: 'Removed', description: 'Item removed from cart' })
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

  const filteredMedicines = availableMedicines.filter(medicine => {
    const matchesSearch = medicine.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || medicine.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = ['all', ...new Set(availableMedicines.map(m => m.category))]

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading Sales...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Sales & Dispensing</h1>
                <p className="text-gray-600 mt-1">Process sales and dispense medications to customers</p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-emerald-600">{availableMedicines.length}</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                  <p className="text-sm text-gray-600">In Cart</p>
                  <p className="text-2xl font-bold text-blue-600">{cart.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Medicine Selection */}
            <div className="lg:col-span-2 space-y-6">
              {/* Search and Filter Section */}
              <Card className="shadow-md border-0">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        placeholder="Search medicines by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-11 bg-white border-gray-300 text-base focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      {categories.map(category => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            selectedCategory === category
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {category === 'all' ? 'All Categories' : category}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Medicines Grid */}
              <Card className="shadow-md border-0">
                <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-blue-50">
                  <CardTitle className="text-xl">Available Medicines</CardTitle>
                  <CardDescription>{filteredMedicines.length} medicines available</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {filteredMedicines.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="mx-auto h-16 w-16 mb-4 text-gray-300" />
                      <p className="text-gray-600 font-medium text-lg">No medicines found</p>
                      <p className="text-sm text-gray-500 mt-1">Try a different search term or category</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredMedicines.map((medicine) => (
                        <div
                          key={medicine.id}
                          className="group p-4 border border-gray-200 rounded-xl hover:shadow-lg hover:border-emerald-300 transition-all duration-300 cursor-pointer bg-white"
                          onClick={() => addToCart(medicine)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">{medicine.name}</h3>
                              <p className="text-xs text-gray-500 mt-1">{medicine.category}</p>
                            </div>
                            <Badge 
                              variant={medicine.quantity < 10 ? "destructive" : "secondary"}
                              className={`ml-2 ${medicine.quantity < 10 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}
                            >
                              {medicine.quantity}
                            </Badge>
                          </div>
                          
                          <p className="text-2xl font-bold text-emerald-600 mb-2">
                            MWK {medicine.price.toLocaleString()}
                          </p>
                          
                          {medicine.expiryDate && (
                            <p className="text-xs text-gray-500 mb-3 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Expires: {new Date(medicine.expiryDate).toLocaleDateString()}
                            </p>
                          )}
                          
                          <Button
                            size="sm"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all"
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

            {/* Shopping Cart Sidebar */}
            <div>
              <Card className="shadow-md border-0 sticky top-6 max-h-[calc(100vh-200px)] flex flex-col">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-emerald-50">
                  <CardTitle className="flex items-center text-xl">
                    <ShoppingCart className="mr-2 h-5 w-5 text-blue-600" />
                    Cart
                  </CardTitle>
                  <CardDescription className="mt-1">{cart.length} item(s)</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-y-auto pt-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className="mx-auto h-14 w-14 mb-3 text-gray-300" />
                      <p className="text-gray-600 font-medium">Cart is empty</p>
                      <p className="text-sm text-gray-500 mt-1">Add medicines to start</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.id} className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:border-emerald-300 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-600 mt-1">MWK {item.price.toLocaleString()} each</p>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-1 bg-white rounded-lg border border-gray-300">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-gray-200"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-gray-200"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="font-bold text-emerald-600 text-sm">MWK {item.total.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>

                {cart.length > 0 && (
                  <div className="border-t bg-gradient-to-b from-white to-gray-50 p-4 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>Subtotal:</span>
                        <span>MWK {getTotalAmount().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-2xl font-bold text-emerald-600 pt-2 border-t">
                        <span>Total:</span>
                        <span>MWK {getTotalAmount().toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">Payment Method</label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger className="bg-white border-gray-300">
                            <SelectValue />
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
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 transition-all shadow-md hover:shadow-lg"
                        onClick={processTransaction}
                        disabled={cart.length === 0 || isProcessing}
                      >
                        {isProcessing ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            Processing...
                          </div>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Complete Sale
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full text-gray-700 border-gray-300 hover:bg-gray-100"
                        onClick={clearCart}
                      >
                        Clear Cart
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Receipt Modal */}
          <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center text-xl">
                  <CheckCircle className="mr-2 h-6 w-6 text-green-600" />
                  Transaction Complete
                </DialogTitle>
                <DialogDescription>
                  Sale processed successfully. Receipt generated below.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <div className="bg-gradient-to-b from-white to-gray-50 p-6 border-2 border-gray-200 rounded-xl">
                  <div className="text-center mb-6 pb-4 border-b-2">
                    <h3 className="font-bold text-xl text-gray-900">PharmaStore Pharmacy</h3>
                    <p className="text-sm text-gray-600 mt-1">Lilongwe, Malawi</p>
                    <p className="text-sm text-gray-600 font-mono mt-2">Receipt #: RCP-{Date.now().toString().slice(-6)}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleString()}</p>
                  </div>
                  
                  <div className="space-y-3 py-4 mb-4 border-b-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-500 ml-2">x{item.quantity}</span>
                        </span>
                        <span className="font-semibold text-gray-900">MWK {item.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-2 mb-4 pb-4 border-b-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-emerald-600">MWK {getTotalAmount().toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-semibold text-gray-900 capitalize">{paymentMethod}</span>
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-gray-700">Thank you for your purchase!</p>
                    <p className="text-xs text-gray-500">Please come again</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleReceiptClose}
                  className="border-gray-300 hover:bg-gray-100"
                >
                  Close
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" 
                  onClick={() => window.print()}
                >
                  <Receipt className="mr-2 h-4 w-4" />
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
