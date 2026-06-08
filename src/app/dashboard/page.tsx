"use client"

import { TrendingUp, Package, AlertTriangle, Calendar, DollarSign, Users, CreditCard, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/layout/sidebar"
import Header from "@/components/layout/header"
import Link from "next/link"
import { Bar, BarChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface DashboardData {
  todaySales: number
  yesterdaySales: number
  lowStockItems: number
  expiringSoonItems: number
  activeUsers: number
  weeklySales: Array<{ name: string; sales: number }>
  stockDistribution: Array<{ name: string; value: number; color: string }>
  topDrugs: Array<{ name: string; quantity: string; trend: string }>
  stockAlerts: Array<{ name: string; status: string; level: string; type: 'warning' | 'danger' }>
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.email) {
      fetchDashboardData()
    }
  }, [session])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard')
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 flex items-center justify-center">
            <div className="flex items-center gap-2 text-emerald-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
              <span>Loading dashboard data...</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 flex items-center justify-center">
            <div className="text-red-500">Error: {error}</div>
          </main>
        </div>
      </div>
    )
  }

  if (!dashboardData) return null

  const salesChange = dashboardData.yesterdaySales > 0
    ? ((dashboardData.todaySales - dashboardData.yesterdaySales) / dashboardData.yesterdaySales) * 100
    : 0

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">

          {/* Summary Cards — unified style matching Inventory */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Today's Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  MWK {dashboardData.todaySales.toLocaleString()}
                </div>
                <p className="text-xs text-emerald-600 mt-1">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  {salesChange > 0 ? '+' : ''}{salesChange.toFixed(1)}% from yesterday
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{dashboardData.lowStockItems}</div>
                <p className="text-xs text-slate-500 mt-1">Items need restocking</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Expiring Soon</CardTitle>
                <Calendar className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{dashboardData.expiringSoonItems}</div>
                <p className="text-xs text-slate-500 mt-1">Items expire within 30 days</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Active Users</CardTitle>
                <Users className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{dashboardData.activeUsers}</div>
                <p className="text-xs text-slate-500 mt-1">Staff members online</p>
              </CardContent>
            </Card>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Link href="/reports">
              <Card className="bg-white shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <FileText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Generate P&L Report</h3>
                      <p className="text-sm text-slate-500">View detailed profit & loss statements</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/sales">
              <Card className="bg-white shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Manage Sales</h3>
                      <p className="text-sm text-slate-500">View and manage your sales data</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/inventory/import">
              <Card className="bg-white shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Package className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Import Inventory</h3>
                      <p className="text-sm text-slate-500">Flexible Excel/CSV import wizard</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="bg-white shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-slate-900">Weekly Sales</CardTitle>
                <CardDescription className="text-slate-500">Sales performance over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData.weeklySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sales" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-slate-900">Stock Distribution</CardTitle>
                <CardDescription className="text-slate-500">Current inventory by category</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboardData.stockDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => {
                        const total = dashboardData.stockDistribution.reduce((sum, entry) => sum + entry.value, 0)
                        const percent = total > 0 ? ((typeof value === 'number' ? value : 0) / total) * 100 : 0
                        return `${name} ${percent.toFixed(0)}%`
                      }}
                    >
                      {dashboardData.stockDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-slate-900">Most Dispensed Drugs</CardTitle>
                <CardDescription className="text-slate-500">Top selling medications this week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.topDrugs.map((drug, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-emerald-50 transition-colors duration-300">
                      <div>
                        <p className="font-medium text-slate-900">{drug.name}</p>
                        <p className="text-sm text-slate-500">{drug.quantity}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                        {drug.trend}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-slate-900">Stock Alerts</CardTitle>
                <CardDescription className="text-slate-500">Items requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.stockAlerts.map((alert, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-emerald-50 transition-colors duration-300">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          alert.type === 'danger' ? 'bg-red-500' : 'bg-orange-500'
                        }`} />
                        <div>
                          <p className="font-medium text-slate-900">{alert.name}</p>
                          <p className="text-sm text-slate-500">{alert.level}</p>
                        </div>
                      </div>
                      <Badge className={alert.type === 'danger'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      }>
                        {alert.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}