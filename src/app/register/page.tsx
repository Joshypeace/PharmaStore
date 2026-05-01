"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, Pill, ArrowLeft, Shield, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import ReCAPTCHA from "react-google-recaptcha"

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [captchaValue, setCaptchaValue] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    pharmacyName: "",
    ownerName: "",
    email: "",
    phone: "",
    licenseNumber: "",
    location: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  if (!captchaValue) {
    alert("Please complete the CAPTCHA verification")
    return
  }
  
  if (formData.password !== formData.confirmPassword) {
    alert("Passwords do not match")
    return
  }
  
  if (!formData.agreeToTerms) {
    alert("Please agree to the terms and conditions")
    return
  }

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Registration failed')
    }

    alert("Registration successful! You can now login.")
    // Redirect to login page
    window.location.href = '/login'
    
  } catch (error) {
    console.error('Registration error:', error)
    alert(error instanceof Error ? error.message : 'Registration failed. Please try again.')
  }
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Back to Home */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <Card className="card-enhanced shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200/50">
              <Pill className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">Create Your PharmaStore Account</CardTitle>
              <CardDescription className="text-gray-600">
                Join hundreds of pharmacies transforming their operations
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Pharmacy Information */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Pharmacy Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-name">Pharmacy Name *</Label>
                    <Input
                      id="pharmacy-name"
                      type="text"
                      placeholder="e.g., Central Pharmacy"
                      className="h-11"
                      value={formData.pharmacyName}
                      onChange={(e) => handleInputChange("pharmacyName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner-name">Owner/Manager Name *</Label>
                    <Input
                      id="owner-name"
                      type="text"
                      placeholder="e.g., Dr. Chisomo Mwale"
                      className="h-11"
                      value={formData.ownerName}
                      onChange={(e) => handleInputChange("ownerName", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="license-number">Pharmacy License Number *</Label>
                    <Input
                      id="license-number"
                      type="text"
                      placeholder="e.g., PH-MW-2024-001"
                      className="h-11"
                      value={formData.licenseNumber}
                      onChange={(e) => handleInputChange("licenseNumber", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Select onValueChange={(value) => handleInputChange("location", value)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select your location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lilongwe">Lilongwe</SelectItem>
                        <SelectItem value="blantyre">Blantyre</SelectItem>
                        <SelectItem value="mzuzu">Mzuzu</SelectItem>
                        <SelectItem value="zomba">Zomba</SelectItem>
                        <SelectItem value="kasungu">Kasungu</SelectItem>
                        <SelectItem value="mangochi">Mangochi</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="pharmacy@example.com"
                      className="h-11"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+265 1 234 567"
                      className="h-11"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Account Security */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Account Security</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        className="h-11 pr-10"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-11 w-11"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="h-11 pr-10"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-11 w-11"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* CAPTCHA */}
              <div className="space-y-4">
                <Label>Security Verification *</Label>
                <div className="flex justify-center">
                  <ReCAPTCHA
                    sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" 
                    onChange={setCaptchaValue}
                    theme="light"
                  />
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
                />
                <Label htmlFor="terms" className="text-sm">
                  I agree to the{" "}
                  <Link href="/terms" className="text-emerald-600 hover:text-emerald-700 underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-emerald-600 hover:text-emerald-700 underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-200/50 rounded-xl text-lg font-semibold"
              >
                Create Account
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>

            <div className="text-center text-xs text-gray-500 space-y-1">
              <p>🔒 Your data is encrypted and secure</p>
              <p>📞 24/7 support available after registration</p>
              <p>✅ Compliant with Malawi healthcare regulations</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
