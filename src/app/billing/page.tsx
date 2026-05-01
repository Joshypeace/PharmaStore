"use client"

import { useState } from "react"
import { Calendar, Check, CreditCard, Download, Clock, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import Sidebar from "@/components/layout/sidebar"

export default function BillingPage() {
  const [currentPlan] = useState("trial") // trial, active, expired
  const [trialDaysLeft] = useState(7)
  const [billingHistory] = useState([
    { date: "2024-01-01", amount: "MK20,000", status: "paid", invoice: "INV-001" },
    { date: "2023-12-01", amount: "MK20,000", status: "paid", invoice: "INV-002" },
    { date: "2023-11-01", amount: "MK20,000", status: "paid", invoice: "INV-003" },
  ])

  const trialProgress = ((10 - trialDaysLeft) / 10) * 100

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent">
          <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Billing & Subscription</h1>
              <p className="text-slate-600">Manage your PharmaStore subscription and billing information</p>
            </div>

            {/* Trial Status Alert */}
            {currentPlan === "trial" && (
              <Alert className="mb-6 border-amber-200 bg-amber-50">
                <Clock className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Trial Period:</strong> You have {trialDaysLeft} days left in your free trial. Upgrade now to
                  continue using PharmaStore without interruption.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Current Plan */}
              <Card className="card-enhanced col-span-1 lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-emerald-600" />
                        Current Plan
                      </CardTitle>
                      <CardDescription>Your subscription details</CardDescription>
                    </div>
                    {currentPlan === "trial" && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Free Trial
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">PharmaStore Professional</h3>
                        <p className="text-slate-600">Full access to all features</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-emerald-600">MK20,000</div>
                        <div className="text-sm text-slate-500">per month</div>
                      </div>
                    </div>

                    {currentPlan === "trial" && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Trial Progress</span>
                          <span>{10 - trialDaysLeft} of 10 days used</span>
                        </div>
                        <Progress value={trialProgress} className="h-2" />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm">Unlimited inventory items</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm">Advanced reporting</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm">Multi-user access</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm">24/7 support</span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      {currentPlan === "trial" ? (
                        <Button className="button-primary flex-1">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Upgrade Now
                        </Button>
                      ) : (
                        <Button variant="outline" className="flex-1 bg-transparent">
                          Manage Subscription
                        </Button>
                      )}
                      <Button variant="outline">Change Plan</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Next Payment */}
              <Card className="card-enhanced">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-slate-600" />
                    Next Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentPlan === "trial" ? (
                      <>
                        <div>
                          <div className="text-2xl font-bold text-slate-900">Trial Ends</div>
                          <div className="text-slate-600">January 15, 2024</div>
                        </div>
                        <div className="text-sm text-slate-500">
                         {` After your trial ends, you'll be charged MK20,000 monthly`}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <div className="text-2xl font-bold text-emerald-600">MK20,000</div>
                          <div className="text-slate-600">Due February 1, 2024</div>
                        </div>
                        <div className="text-sm text-slate-500">Payment will be automatically processed</div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Billing History */}
            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>Your recent payments and invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {billingHistory.map((payment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <CreditCard className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{payment.amount}</div>
                          <div className="text-sm text-slate-500">{payment.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          {payment.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Invoice
                        </Button>
                      </div>
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
