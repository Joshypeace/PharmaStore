// components/PublicAuthModal.tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Phone, Mail, User, Lock } from "lucide-react"

interface PublicAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: any, sessionToken: string) => void
  redirectAfterAuth?: () => void
}

export function PublicAuthModal({ isOpen, onClose, onSuccess, redirectAfterAuth }: PublicAuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")
  const [loading, setLoading] = useState(false)
  
  // Login form
  const [loginData, setLoginData] = useState({
    phoneNumber: "",
    password: "",
  })
  
  // Register form
  const [registerData, setRegisterData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginData.phoneNumber || !loginData.password) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/public/authentication/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData)
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      localStorage.setItem("publicSessionToken", data.sessionToken)
      localStorage.setItem("publicUser", JSON.stringify(data.user))
      
      toast({ title: "Success", description: data.message })
      onSuccess(data.user, data.sessionToken)
      onClose()
      if (redirectAfterAuth) redirectAfterAuth()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerData.name || !registerData.phoneNumber || !registerData.password) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" })
      return
    }
    if (registerData.password !== registerData.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/public/authentication/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerData.name,
          phoneNumber: registerData.phoneNumber,
          email: registerData.email,
          password: registerData.password,
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      localStorage.setItem("publicSessionToken", data.sessionToken)
      localStorage.setItem("publicUser", JSON.stringify(data.user))
      
      toast({ title: "Success", description: data.message })
      onSuccess(data.user, data.sessionToken)
      onClose()
      if (redirectAfterAuth) redirectAfterAuth()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Welcome to MedTrack
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="login-phone">Phone Number *</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-phone"
                    type="tel"
                    placeholder="+265 888 123 456"
                    value={loginData.phoneNumber}
                    onChange={(e) => setLoginData({ ...loginData, phoneNumber: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="login-password">Password *</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Login
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="register-name">Full Name *</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-name"
                    placeholder="John Doe"
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="register-phone">Phone Number *</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-phone"
                    type="tel"
                    placeholder="+265 888 123 456"
                    value={registerData.phoneNumber}
                    onChange={(e) => setRegisterData({ ...registerData, phoneNumber: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="register-email">Email (Optional)</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="john@example.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="register-password">Password *</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Create a password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="register-confirm">Confirm Password *</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-confirm"
                    type="password"
                    placeholder="Confirm your password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        
        <div className="text-center text-xs text-gray-500 mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </div>
      </DialogContent>
    </Dialog>
  )
}