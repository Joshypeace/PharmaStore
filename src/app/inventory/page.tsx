"use client"

import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Plus, Edit, Trash2, Package, Calendar, AlertTriangle, Upload, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import ImportWizard from '@/components/import-wizard/import-wizard'
import { toast } from 'sonner'

interface InventoryItem {
  id: string
  name: string
  batch: string
  quantity: number
  expiry: string
  category: string
  price: number
  status: string
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false)
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([])
  const [filteredData, setFilteredData] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newItem, setNewItem] = useState({
    name: '',
    batch: '',
    quantity: 0,
    expiry: '',
    category: '',
    price: 0
  })

  const fetchInventoryData = useCallback(async () => {
    try {
      setIsLoading(true)
      const queryParams = new URLSearchParams()
      if (searchTerm) queryParams.append('search', searchTerm)
      if (selectedCategory !== 'all') queryParams.append('category', selectedCategory)
      
      const response = await fetch(`/api/inventory?${queryParams.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch inventory')
      
      const data = await response.json()
      setInventoryData(data)
      setFilteredData(data)
    } catch (error) {
      console.error('Error fetching inventory:', error)
      toast.error('Failed to load inventory data')
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, selectedCategory])

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchInventoryData()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedCategory, fetchInventoryData])

  useEffect(() => {
  fetchInventoryData()
}, [])

  const getStatusBadge = (status: string, quantity: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>
    } else if (quantity < 10) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Low Stock</Badge>
    } else if (status === 'Expires Soon') {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Expires Soon</Badge>
    } else {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">In Stock</Badge>
    }
  }

  const handleAddItem = async () => {
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItem),
      })

      if (!response.ok) {
        throw new Error('Failed to add item')
      }

      toast.success('Item added successfully')
      setIsAddModalOpen(false)
      setNewItem({
        name: '',
        batch: '',
        quantity: 0,
        expiry: '',
        category: '',
        price: 0
      })
      fetchInventoryData()
    } catch (error) {
      console.error('Error adding item:', error)
      toast.error('Failed to add item')
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      toast.success('Item deleted successfully')
      fetchInventoryData()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  // Calculate summary stats
  const summaryStats = {
    totalItems: inventoryData.length,
    lowStock: inventoryData.filter(item => item.quantity < 10 && item.quantity > 0).length,
    expiringSoon: inventoryData.filter(item => item.status === 'Expires Soon').length,
    outOfStock: inventoryData.filter(item => item.quantity === 0).length,
    totalValue: inventoryData.reduce((sum, item) => sum + (item.quantity * item.price), 0),
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Management</h1>
            <p className="text-gray-600">Manage your pharmacy stock and monitor inventory levels</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card className="card-enhanced">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalItems}</div>
                <p className="text-xs text-muted-foreground">Different medications</p>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{summaryStats.lowStock}</div>
                <p className="text-xs text-muted-foreground">Items below threshold</p>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                <Calendar className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{summaryStats.expiringSoon}</div>
                <p className="text-xs text-muted-foreground">Within 30 days</p>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                <Package className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summaryStats.outOfStock}</div>
                <p className="text-xs text-muted-foreground">Items unavailable</p>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  MWK {summaryStats.totalValue.toLocaleString('en-US')}
                </div>
                <p className="text-xs text-muted-foreground">Inventory value</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card className="card-enhanced mb-6">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Medicine Inventory</CardTitle>
                  <CardDescription>Search and manage your pharmacy stock</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsImportWizardOpen(true)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg rounded-xl"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import from Excel
                  </Button>
                  <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg rounded-xl">
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Stock
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add New Medicine</DialogTitle>
                        <DialogDescription>
                          Enter the details of the new medicine to add to inventory.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="medicine-name">Medicine Name</Label>
                          <Input
                            id="medicine-name"
                            placeholder="e.g., Paracetamol 500mg"
                            value={newItem.name}
                            onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="batch-number">Batch Number</Label>
                          <Input
                            id="batch-number"
                            placeholder="e.g., PAR001"
                            value={newItem.batch}
                            onChange={(e) => setNewItem({...newItem, batch: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                              id="quantity"
                              type="number"
                              placeholder="100"
                              value={newItem.quantity}
                              onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="expiry-date">Expiry Date</Label>
                            <Input
                              id="expiry-date"
                              type="date"
                              value={newItem.expiry}
                              onChange={(e) => setNewItem({...newItem, expiry: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={newItem.category}
                            onValueChange={(value) => setNewItem({...newItem, category: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Antibiotics">Antibiotics</SelectItem>
                              <SelectItem value="Pain Relief">Pain Relief</SelectItem>
                              <SelectItem value="Vitamins">Vitamins</SelectItem>
                              <SelectItem value="Diabetes">Diabetes</SelectItem>
                              <SelectItem value="Gastric">Gastric</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="price">Unit Price (MWK)</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={newItem.price}
                            onChange={(e) => setNewItem({...newItem, price: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddItem} className="bg-green-600 hover:bg-green-700">
                          Add Medicine
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by medicine name or batch number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Antibiotics">Antibiotics</SelectItem>
                    <SelectItem value="Pain Relief">Pain Relief</SelectItem>
                    <SelectItem value="Vitamins">Vitamins</SelectItem>
                    <SelectItem value="Diabetes">Diabetes</SelectItem>
                    <SelectItem value="Gastric">Gastric</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Inventory Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine Name</TableHead>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit Price (MWK)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading inventory...
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No items found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.batch}</TableCell>
                          <TableCell>
                            <span className={item.quantity < 10 ? 'text-orange-600 font-semibold' : ''}>
                              {item.quantity}
                            </span>
                          </TableCell>
                          <TableCell>{item.expiry}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>MWK {item.price.toLocaleString('en-US')}</TableCell>
                          <TableCell>{getStatusBadge(item.status, item.quantity)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
      <ImportWizard
        isOpen={isImportWizardOpen}
        onClose={() => setIsImportWizardOpen(false)}
        onSuccess={fetchInventoryData}
      />
    </div>
  )
}