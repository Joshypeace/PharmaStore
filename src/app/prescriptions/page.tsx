"use client"

import { useState, useEffect, useCallback } from 'react'
import { Search, Upload, Eye, FileText, User, Calendar, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import { toast } from 'sonner'

interface Prescription {
  id: string
  patientName: string
  age: number
  gender: string
  doctor: string
  date: string
  status: 'PENDING' | 'DISPENSED' | 'COMPLETED'
  medications: string[]
  imageUrl?: string
}

export default function PrescriptionsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newPrescription, setNewPrescription] = useState({
    patientName: '',
    age: '',
    gender: '',
    doctor: '',
    medications: '',
    imageUrl: ''
  })

  const fetchPrescriptions = useCallback(async () => {
    try {
      setIsLoading(true)
      const queryParams = new URLSearchParams()
      if (searchTerm) queryParams.append('search', searchTerm)
      if (selectedStatus !== 'all') queryParams.append('status', selectedStatus)
      
      const response = await fetch(`/api/prescriptions?${queryParams.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch prescriptions')
      
      const data = await response.json()
      setPrescriptions(data)
    } catch (error) {
      console.error('Error fetching prescriptions:', error)
      toast.error('Failed to load prescriptions')
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, selectedStatus])

  useEffect(() => {
    fetchPrescriptions()
  }, [fetchPrescriptions])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'DISPENSED':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Dispensed</Badge>
      case 'COMPLETED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleAddPrescription = async () => {
    try {
      const medications = newPrescription.medications.split('\n').filter(med => med.trim())
      
      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newPrescription,
          age: Number(newPrescription.age),
          medications,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add prescription')
      }

      toast.success('Prescription added successfully')
      setIsAddModalOpen(false)
      setNewPrescription({
        patientName: '',
        age: '',
        gender: '',
        doctor: '',
        medications: '',
        imageUrl: ''
      })
      fetchPrescriptions()
    } catch (error) {
      console.error('Error adding prescription:', error)
      toast.error('Failed to add prescription')
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: 'DISPENSED' | 'COMPLETED') => {
    try {
      const response = await fetch('/api/prescriptions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update prescription status')
      }

      toast.success('Prescription status updated successfully')
      fetchPrescriptions()
    } catch (error) {
      console.error('Error updating prescription:', error)
      toast.error('Failed to update prescription status')
    }
  }

  const filteredData = prescriptions.filter(prescription => {
    const matchesSearch = prescription.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.doctor.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || prescription.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  // Calculate summary stats
  const summaryStats = {
    total: prescriptions.length,
    pending: prescriptions.filter(p => p.status === 'PENDING').length,
    dispensed: prescriptions.filter(p => p.status === 'DISPENSED').length,
    completed: prescriptions.filter(p => p.status === 'COMPLETED').length,
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Prescription Records</h1>
            <p className="text-gray-600">Manage patient prescriptions and medical records</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Prescriptions</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.total}</div>
                <p className="text-xs text-muted-foreground">All prescriptions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Calendar className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{summaryStats.pending}</div>
                <p className="text-xs text-muted-foreground">Awaiting dispensing</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dispensed</CardTitle>
                <User className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{summaryStats.dispensed}</div>
                <p className="text-xs text-muted-foreground">Medications dispensed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <FileText className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summaryStats.completed}</div>
                <p className="text-xs text-muted-foreground">Fully processed</p>
              </CardContent>
            </Card>
          </div>

          {/* Prescriptions Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Prescription Records</CardTitle>
                  <CardDescription>View and manage patient prescriptions</CardDescription>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Upload className="mr-2 h-4 w-4" />
                      Add Prescription
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add New Prescription</DialogTitle>
                      <DialogDescription>
                        Enter patient details and prescription information.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="patient-name">Patient Name</Label>
                          <Input 
                            id="patient-name" 
                            placeholder="John Banda" 
                            value={newPrescription.patientName}
                            onChange={(e) => setNewPrescription({...newPrescription, patientName: e.target.value})}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="age">Age</Label>
                          <Input 
                            id="age" 
                            type="number" 
                            placeholder="45" 
                            value={newPrescription.age}
                            onChange={(e) => setNewPrescription({...newPrescription, age: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="gender">Gender</Label>
                          <Select
                            value={newPrescription.gender}
                            onValueChange={(value) => setNewPrescription({...newPrescription, gender: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="doctor">Doctor</Label>
                          <Input 
                            id="doctor" 
                            placeholder="Dr. Chisomo Mwale" 
                            value={newPrescription.doctor}
                            onChange={(e) => setNewPrescription({...newPrescription, doctor: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="medications">Medications (one per line)</Label>
                        <Textarea
                          id="medications"
                          placeholder="Amoxicillin 500mg\nParacetamol 500mg"
                          rows={3}
                          value={newPrescription.medications}
                          onChange={(e) => setNewPrescription({...newPrescription, medications: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                        <Input
                          id="imageUrl"
                          placeholder="https://example.com/prescription.jpg"
                          value={newPrescription.imageUrl}
                          onChange={(e) => setNewPrescription({...newPrescription, imageUrl: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAddPrescription} 
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Add Prescription
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by patient name or doctor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="DISPENSED">Dispensed</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Medications</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading prescriptions...
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No prescriptions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((prescription) => (
                        <TableRow key={prescription.id}>
                          <TableCell className="font-medium">{prescription.patientName}</TableCell>
                          <TableCell>{prescription.age}</TableCell>
                          <TableCell>{prescription.gender}</TableCell>
                          <TableCell>{prescription.doctor}</TableCell>
                          <TableCell>{new Date(prescription.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              {prescription.medications.slice(0, 2).map((med, index) => (
                                <div key={index} className="text-sm">{med}</div>
                              ))}
                              {prescription.medications.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{prescription.medications.length - 2} more
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(prescription.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedPrescription(prescription)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[600px]">
                                  <DialogHeader>
                                    <DialogTitle>Prescription Details</DialogTitle>
                                    <DialogDescription>
                                      View complete prescription information
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedPrescription && (
                                    <div className="grid gap-4 py-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label className="text-sm font-medium">Patient Name</Label>
                                          <p className="text-sm text-gray-600">{selectedPrescription.patientName}</p>
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium">Age</Label>
                                          <p className="text-sm text-gray-600">{selectedPrescription.age} years</p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label className="text-sm font-medium">Gender</Label>
                                          <p className="text-sm text-gray-600">{selectedPrescription.gender}</p>
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium">Doctor</Label>
                                          <p className="text-sm text-gray-600">{selectedPrescription.doctor}</p>
                                        </div>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium">Prescribed Medications</Label>
                                        <div className="mt-2 space-y-1">
                                          {selectedPrescription.medications.map((med, index) => (
                                            <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                                              {med}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      {selectedPrescription.imageUrl && (
                                        <div>
                                          <Label className="text-sm font-medium">Prescription Image</Label>
                                          <div className="mt-2">
                                            <img 
                                              src={selectedPrescription.imageUrl} 
                                              alt="Prescription" 
                                              className="w-full h-48 object-contain border rounded-lg"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                              {prescription.status === 'PENDING' && (
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleUpdateStatus(prescription.id, 'DISPENSED')}
                                >
                                  Dispense
                                </Button>
                              )}
                              {prescription.status === 'DISPENSED' && (
                                <Button 
                                  size="sm" 
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={() => handleUpdateStatus(prescription.id, 'COMPLETED')}
                                >
                                  Complete
                                </Button>
                              )}
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
    </div>
  )
}