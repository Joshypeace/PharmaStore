"use client"

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Edit, Trash2, User, Shield, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
  lastLogin: string | null
  permissions: string[]
}

interface NewUser {
  name: string
  email: string
  password: string
  role: string
  permissions: Record<string, { view: boolean; edit: boolean; delete: boolean }>
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newUser, setNewUser] = useState<NewUser>({
    name: '',
    email: '',
    password: '',
    role: 'ASSISTANT',
    permissions: {
      inventory: { view: false, edit: false, delete: false },
      sales: { view: false, edit: false, delete: false },
      prescriptions: { view: false, edit: false, delete: false },
      reports: { view: false, edit: false, delete: false },
      users: { view: false, edit: false, delete: false },
      settings: { view: false, edit: false, delete: false },
    }
  })

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const queryParams = new URLSearchParams()
      if (searchTerm) queryParams.append('search', searchTerm)
      if (selectedRole !== 'all') queryParams.append('role', selectedRole)
      
      const response = await fetch(`/api/users?${queryParams.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, selectedRole])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'PHARMACIST':
        return <Badge className="bg-green-100 text-green-800">Pharmacist</Badge>
      case 'TECHNICIAN':
        return <Badge className="bg-blue-100 text-blue-800">Technician</Badge>
      case 'CASHIER':
        return <Badge className="bg-purple-100 text-purple-800">Cashier</Badge>
      case 'ASSISTANT':
        return <Badge className="bg-orange-100 text-orange-800">Assistant</Badge>
      case 'ADMIN':
        return <Badge className="bg-red-100 text-red-800">Admin</Badge>
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    return status === 'ACTIVE' 
      ? <Badge className="bg-green-100 text-green-800">Active</Badge>
      : <Badge className="bg-red-100 text-red-800">Inactive</Badge>
  }

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create user')
      }

      toast.success('User created successfully')
      setIsAddModalOpen(false)
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'ASSISTANT',
        permissions: {
          inventory: { view: false, edit: false, delete: false },
          sales: { view: false, edit: false, delete: false },
          prescriptions: { view: false, edit: false, delete: false },
          reports: { view: false, edit: false, delete: false },
          users: { view: false, edit: false, delete: false },
          settings: { view: false, edit: false, delete: false },
        }
      })
      fetchUsers()
    } catch {
      console.error('Error creating user:')
      toast.error( 'Failed to create user')
    }
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          permissions: newUser.permissions,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update user')
      }

      toast.success('User permissions updated successfully')
      setIsEditModalOpen(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user permissions')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      toast.success('User deleted successfully')
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    }
  }

  const filteredData = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    return matchesSearch && matchesRole
  })

  // Calculate summary stats
  const summaryStats = {
    total: users.length,
    active: users.filter(u => u.status === 'ACTIVE').length,
    pharmacists: users.filter(u => u.role === 'PHARMACIST').length,
    // For online users, you might want to implement a real-time check
    online: users.filter(u => u.lastLogin && new Date(u.lastLogin).getTime() > Date.now() - 300000).length,
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading users...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
            <p className="text-gray-600">Manage system users and their access permissions</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.total}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summaryStats.active}</div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pharmacists</CardTitle>
                <Shield className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{summaryStats.pharmacists}</div>
                <p className="text-xs text-muted-foreground">Licensed pharmacists</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online Now</CardTitle>
                <User className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{summaryStats.online}</div>
                <p className="text-xs text-muted-foreground">Currently logged in</p>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>System Users</CardTitle>
                  <CardDescription>Manage user accounts and permissions</CardDescription>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account and assign permissions.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="full-name">Full Name</Label>
                          <Input 
                            id="full-name" 
                            placeholder="John Banda" 
                            value={newUser.name}
                            onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="email">Email</Label>
                          <Input 
                            id="email" 
                            type="email" 
                            placeholder="john@medtrack.mw" 
                            value={newUser.email}
                            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="role">Role</Label>
                          <Select
                            value={newUser.role}
                            onValueChange={(value) => setNewUser({...newUser, role: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                              <SelectItem value="TECHNICIAN">Technician</SelectItem>
                              <SelectItem value="CASHIER">Cashier</SelectItem>
                              <SelectItem value="ASSISTANT">Assistant</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="password">Password</Label>
                          <Input 
                            id="password" 
                            type="password" 
                            placeholder="••••••••" 
                            value={newUser.password}
                            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid gap-4">
                        <Label>Permissions</Label>
                        <div className="space-y-3">
                          {[
                            { id: 'inventory', label: 'Inventory Management' },
                            { id: 'sales', label: 'Sales & Dispensing' },
                            { id: 'prescriptions', label: 'Prescription Records' },
                            { id: 'reports', label: 'Reports & Analytics' },
                            { id: 'users', label: 'User Management' },
                            { id: 'settings', label: 'System Settings' }
                          ].map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Switch 
                                id={permission.id} 
                                checked={newUser.permissions[permission.id]?.view || false}
                                onCheckedChange={(checked) => setNewUser({
                                  ...newUser,
                                  permissions: {
                                    ...newUser.permissions,
                                    [permission.id]: {
                                      ...newUser.permissions[permission.id],
                                      view: checked
                                    }
                                  }
                                })}
                              />
                              <Label htmlFor={permission.id} className="text-sm">
                                {permission.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUser} className="bg-green-600 hover:bg-green-700">
                        Create User
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
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                    <SelectItem value="TECHNICIAN">Technician</SelectItem>
                    <SelectItem value="CASHIER">Cashier</SelectItem>
                    <SelectItem value="ASSISTANT">Assistant</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length > 0 ? (
                      filteredData.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedUser(user)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                  <DialogHeader>
                                    <DialogTitle>Edit User Permissions</DialogTitle>
                                    <DialogDescription>
                                      Modify user access and permissions
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedUser && (
                                    <div className="grid gap-4 py-4">
                                      <div className="grid gap-2">
                                        <Label>User Details</Label>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                          <p className="font-medium">{selectedUser.name}</p>
                                          <p className="text-sm text-gray-600">{selectedUser.email}</p>
                                          <p className="text-sm text-gray-600">{selectedUser.role}</p>
                                        </div>
                                      </div>
                                      <div className="grid gap-4">
                                        <Label>Permissions</Label>
                                        <div className="space-y-3">
                                          {[
                                            { id: 'inventory', label: 'Inventory Management' },
                                            { id: 'sales', label: 'Sales & Dispensing' },
                                            { id: 'prescriptions', label: 'Prescription Records' },
                                            { id: 'reports', label: 'Reports & Analytics' },
                                            { id: 'users', label: 'User Management' },
                                            { id: 'settings', label: 'System Settings' }
                                          ].map((permission) => (
                                            <div key={permission.id} className="flex items-center space-x-2">
                                              <Switch 
                                                id={permission.id} 
                                                checked={selectedUser.permissions.includes(permission.id.toUpperCase())}
                                                onCheckedChange={(checked) => {
                                                  const updatedPermissions = checked
                                                    ? [...selectedUser.permissions, permission.id.toUpperCase()]
                                                    : selectedUser.permissions.filter(p => p !== permission.id.toUpperCase())
                                                  setSelectedUser({
                                                    ...selectedUser,
                                                    permissions: updatedPermissions
                                                  })
                                                }}
                                              />
                                              <Label htmlFor={permission.id} className="text-sm">
                                                {permission.label}
                                              </Label>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                                      Cancel
                                    </Button>
                                    <Button onClick={handleUpdateUser} className="bg-green-600 hover:bg-green-700">
                                      Save Changes
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No users found
                        </TableCell>
                      </TableRow>
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