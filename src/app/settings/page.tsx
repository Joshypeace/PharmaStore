"use client"

import { useState, useEffect } from 'react'
import { Save, Building, Bell, Shield, Database, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import { toast } from 'sonner'

interface PharmacySettings {
  name: string
  licenseNumber: string
  phone: string
  email: string
  address: string
}

interface AlertSettings {
  lowStockThreshold: number
  expiryAlertDays: number
  emailNotifications: boolean
  smsNotifications: boolean
  dailyReports: boolean
}

interface SecuritySettings {
  sessionTimeout: number
  passwordPolicy: string
  twoFactorAuth: boolean
  auditLogging: boolean
  ipRestrictions: boolean
}

interface BackupSettings {
  backupFrequency: string
  automaticBackups: boolean
  lastBackup: string | null
}

export default function SettingsPage() {
  const [pharmacySettings, setPharmacySettings] = useState<PharmacySettings>({
    name: '',
    licenseNumber: '',
    phone: '',
    email: '',
    address: '',
  })

  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    lowStockThreshold: 10,
    expiryAlertDays: 30,
    emailNotifications: true,
    smsNotifications: false,
    dailyReports: true,
  })

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    sessionTimeout: 30,
    passwordPolicy: 'medium',
    twoFactorAuth: false,
    auditLogging: true,
    ipRestrictions: false,
  })

  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    backupFrequency: 'daily',
    automaticBackups: true,
    lastBackup: null,
  })

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      
      const [pharmacyRes, alertRes, securityRes, backupRes] = await Promise.all([
        fetch('/api/settings/pharmacy'),
        fetch('/api/settings/alerts'),
        fetch('/api/settings/security'),
        fetch('/api/settings/backup')
      ])

      if (pharmacyRes.ok) {
        const data = await pharmacyRes.json()
        setPharmacySettings(data)
      }

      if (alertRes.ok) {
        const data = await alertRes.json()
        setAlertSettings(data)
      }

      if (securityRes.ok) {
        const data = await securityRes.json()
        setSecuritySettings(data)
      }

      if (backupRes.ok) {
        const data = await backupRes.json()
        setBackupSettings(data)
      }

    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const savePharmacySettings = async () => {
    try {
      const response = await fetch('/api/settings/pharmacy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pharmacySettings),
      })

      if (!response.ok) throw new Error('Failed to save pharmacy settings')
      
      toast.success('Pharmacy settings saved successfully')
    } catch (error) {
      console.error('Error saving pharmacy settings:', error)
      toast.error('Failed to save pharmacy settings')
    }
  }

  const saveAlertSettings = async () => {
    try {
      const response = await fetch('/api/settings/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertSettings),
      })

      if (!response.ok) throw new Error('Failed to save alert settings')
      
      toast.success('Alert settings saved successfully')
    } catch (error) {
      console.error('Error saving alert settings:', error)
      toast.error('Failed to save alert settings')
    }
  }

  const saveSecuritySettings = async () => {
    try {
      const response = await fetch('/api/settings/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(securitySettings),
      })

      if (!response.ok) throw new Error('Failed to save security settings')
      
      toast.success('Security settings saved successfully')
    } catch (error) {
      console.error('Error saving security settings:', error)
      toast.error('Failed to save security settings')
    }
  }

  const saveBackupSettings = async () => {
    try {
      const response = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backupSettings),
      })

      if (!response.ok) throw new Error('Failed to save backup settings')
      
      toast.success('Backup settings saved successfully')
    } catch (error) {
      console.error('Error saving backup settings:', error)
      toast.error('Failed to save backup settings')
    }
  }

  const createManualBackup = async () => {
    try {
      const response = await fetch('/api/settings/backup', {
        method: 'PUT',
      })

      if (!response.ok) throw new Error('Failed to create backup')
      
      const data = await response.json()
      setBackupSettings(prev => ({ ...prev, lastBackup: data.lastBackup }))
      toast.success('Backup created successfully')
    } catch (error) {
      console.error('Error creating backup:', error)
      toast.error('Failed to create backup')
    }
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
                <p className="text-gray-600">Loading settings...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">System Settings</h1>
            <p className="text-gray-600">Configure pharmacy settings and system preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pharmacy Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Pharmacy Information
                </CardTitle>
                <CardDescription>
                  Update your pharmacy details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="pharmacy-name">Pharmacy Name</Label>
                  <Input 
                    id="pharmacy-name" 
                    value={pharmacySettings.name}
                    onChange={(e) => setPharmacySettings({...pharmacySettings, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="license-number">License Number</Label>
                  <Input 
                    id="license-number" 
                    value={pharmacySettings.licenseNumber}
                    onChange={(e) => setPharmacySettings({...pharmacySettings, licenseNumber: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    value={pharmacySettings.phone}
                    onChange={(e) => setPharmacySettings({...pharmacySettings, phone: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={pharmacySettings.email}
                    onChange={(e) => setPharmacySettings({...pharmacySettings, email: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea 
                    id="address" 
                    value={pharmacySettings.address}
                    onChange={(e) => setPharmacySettings({...pharmacySettings, address: e.target.value})}
                    rows={3}
                  />
                </div>
                <Button onClick={savePharmacySettings} className="w-full bg-green-600 hover:bg-green-700">
                  <Save className="mr-2 h-4 w-4" />
                  Save Pharmacy Details
                </Button>
              </CardContent>
            </Card>

            {/* Alert Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  Alert Settings
                </CardTitle>
                <CardDescription>
                  Configure stock alerts and notification thresholds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="low-stock">Low Stock Alert Threshold</Label>
                    <div className="flex items-center space-x-2">
                      <Input 
                        id="low-stock" 
                        type="number" 
                        value={alertSettings.lowStockThreshold}
                        onChange={(e) => setAlertSettings({...alertSettings, lowStockThreshold: parseInt(e.target.value) || 10})}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">items remaining</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Alert when stock falls below this number
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="expiry-alert">Expiry Alert Period</Label>
                    <div className="flex items-center space-x-2">
                      <Input 
                        id="expiry-alert" 
                        type="number" 
                        value={alertSettings.expiryAlertDays}
                        onChange={(e) => setAlertSettings({...alertSettings, expiryAlertDays: parseInt(e.target.value) || 30})}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">days before expiry</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Alert when medicines expire within this period
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Notification Preferences</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-xs text-gray-500">Receive alerts via email</p>
                    </div>
                    <Switch 
                      checked={alertSettings.emailNotifications}
                      onCheckedChange={(checked) => setAlertSettings({...alertSettings, emailNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS Notifications</Label>
                      <p className="text-xs text-gray-500">Receive alerts via SMS</p>
                    </div>
                    <Switch 
                      checked={alertSettings.smsNotifications}
                      onCheckedChange={(checked) => setAlertSettings({...alertSettings, smsNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Daily Reports</Label>
                      <p className="text-xs text-gray-500">Automated daily summary</p>
                    </div>
                    <Switch 
                      checked={alertSettings.dailyReports}
                      onCheckedChange={(checked) => setAlertSettings({...alertSettings, dailyReports: checked})}
                    />
                  </div>
                </div>

                <Button onClick={saveAlertSettings} className="w-full bg-green-600 hover:bg-green-700">
                  <Save className="mr-2 h-4 w-4" />
                  Save Alert Settings
                </Button>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage system security and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="session-timeout">Session Timeout</Label>
                    <Select 
                      value={securitySettings.sessionTimeout.toString()}
                      onValueChange={(value) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Automatically log out inactive users
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password-policy">Password Policy</Label>
                    <Select 
                      value={securitySettings.passwordPolicy}
                      onValueChange={(value) => setSecuritySettings({...securitySettings, passwordPolicy: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Basic (6+ characters)</SelectItem>
                        <SelectItem value="medium">Medium (8+ chars, mixed case)</SelectItem>
                        <SelectItem value="high">Strong (12+ chars, symbols)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Access Controls</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-xs text-gray-500">Require 2FA for all users</p>
                    </div>
                    <Switch 
                      checked={securitySettings.twoFactorAuth}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, twoFactorAuth: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Audit Logging</Label>
                      <p className="text-xs text-gray-500">Log all user activities</p>
                    </div>
                    <Switch 
                      checked={securitySettings.auditLogging}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, auditLogging: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>IP Restrictions</Label>
                      <p className="text-xs text-gray-500">Limit access by IP address</p>
                    </div>
                    <Switch 
                      checked={securitySettings.ipRestrictions}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, ipRestrictions: checked})}
                    />
                  </div>
                </div>

                <Button onClick={saveSecuritySettings} className="w-full bg-green-600 hover:bg-green-700">
                  <Save className="mr-2 h-4 w-4" />
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>
                  Backup and restore your pharmacy data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Last Backup</h4>
                    <p className="text-sm text-green-700">
                      {backupSettings.lastBackup 
                        ? new Date(backupSettings.lastBackup).toLocaleString() 
                        : 'No backups yet'
                      }
                    </p>
                    {backupSettings.lastBackup && (
                      <p className="text-xs text-green-600 mt-1">Automatic backup completed successfully</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label>Backup Frequency</Label>
                    <Select 
                      value={backupSettings.backupFrequency}
                      onValueChange={(value) => setBackupSettings({...backupSettings, backupFrequency: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Every Hour</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Automatic Backups</Label>
                      <p className="text-xs text-gray-500">Enable scheduled backups</p>
                    </div>
                    <Switch 
                      checked={backupSettings.automaticBackups}
                      onCheckedChange={(checked) => setBackupSettings({...backupSettings, automaticBackups: checked})}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button onClick={createManualBackup} className="w-full" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Create Manual Backup
                  </Button>
                  
                  <Button className="w-full" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Data (CSV)
                  </Button>
                  
                  <Button onClick={saveBackupSettings} className="w-full bg-green-600 hover:bg-green-700">
                    <Save className="mr-2 h-4 w-4" />
                    Save Backup Settings
                  </Button>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-1">Data Retention</h4>
                  <p className="text-xs text-yellow-700">
                    Transaction data is retained for 7 years as per Malawi pharmacy regulations
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}