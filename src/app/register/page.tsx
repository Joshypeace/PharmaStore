"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Pill, ArrowLeft, Shield, CheckCircle, Loader2, AlertCircle, Play, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { LocationPicker } from "@/components/register/location-picker"
import { GoogleMapsProvider } from "@/components/providers/google-maps-provider"
import ReCAPTCHA from "react-google-recaptcha"

interface LocationData {
  formattedAddress: string
  latitude: number
  longitude: number
  placeId: string
}

interface PasswordStrength {
  score: number // 0-4
  message: string
  color: string
  requirements: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    number: boolean
    special: boolean
  }
}

function VideoTutorialModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <Play className="h-4 w-4 text-emerald-600 fill-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">How to Pin Your Location</p>
              <p className="text-xs text-gray-500">Watch this quick guide to set your pharmacy location</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Video */}
        <div className="relative bg-black aspect-video">
          {!videoError ? (
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              controls
              autoPlay
              playsInline
              onError={() => setVideoError(true)}
              src="/videos/location-guide.mp4"
            >
              <track kind="captions" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <p className="text-lg font-semibold mb-2">Video unavailable</p>
              <p className="text-sm text-gray-400 mb-4">
                The tutorial video couldn't be loaded. Please check your connection.
              </p>
              <div className="text-left text-sm text-gray-300 bg-gray-800 p-4 rounded-lg">
                <p className="font-semibold mb-2">📍 Quick Guide to Pin Your Location:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Type your pharmacy address in the search box</li>
                  <li>Select the correct suggestion from the dropdown</li>
                  <li>Verify the pin appears at your exact location</li>
                  <li>Click "Confirm Location" to save</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="px-5 py-3 bg-emerald-50 flex items-start space-x-2">
          <span className="text-emerald-600 text-sm">📍</span>
          <p className="text-xs text-emerald-700">
            Tip: Type your pharmacy address in the search box, then select the correct suggestion from the dropdown to pin your exact location.
          </p>
        </div>
      </div>
    </div>
  )
}


export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [captchaValue, setCaptchaValue] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [locationError, setLocationError] = useState<string>("")
  const [showVideoGuide, setShowVideoGuide] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    message: "Enter a password",
    color: "bg-gray-200",
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    },
  })
  
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
    city: "",
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    
    // Check password strength when password changes
    if (field === "password") {
      checkPasswordStrength(value as string)
    }
  }

  const checkPasswordStrength = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }

    const metCount = Object.values(requirements).filter(Boolean).length
    
    let score = 0
    let message = ""
    let color = ""

    if (password.length === 0) {
      score = 0
      message = "Enter a password"
      color = "bg-gray-200"
    } else if (metCount <= 2) {
      score = 1
      message = "Weak password"
      color = "bg-red-500"
    } else if (metCount === 3) {
      score = 2
      message = "Fair password"
      color = "bg-yellow-500"
    } else if (metCount === 4) {
      score = 3
      message = "Good password"
      color = "bg-blue-500"
    } else {
      score = 4
      message = "Strong password"
      color = "bg-green-500"
    }

    setPasswordStrength({
      score,
      message,
      color,
      requirements,
    })
  }

  const handleLocationSelect = (location: LocationData) => {
    setLocationData(location)
    setFormData((prev) => ({ ...prev, location: location.formattedAddress }))
    setLocationError("")
  }

  const validateForm = (): boolean => {
    // Validate location
    if (!locationData || locationData.latitude === 0 || locationData.longitude === 0) {
      setLocationError("Please select a valid location from the suggestions")
      return false
    }

    // Validate password strength
    if (passwordStrength.score < 3) {
      alert("Please use a stronger password. Password must be at least Good strength.")
      return false
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match")
      return false
    }

    // Validate CAPTCHA
    if (!captchaValue) {
      alert("Please complete the CAPTCHA verification")
      return false
    }

    // Validate terms
    if (!formData.agreeToTerms) {
      alert("Please agree to the terms and conditions")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const registrationData = {
        pharmacyName: formData.pharmacyName.trim(),
        ownerName: formData.ownerName.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        licenseNumber: formData.licenseNumber.trim(),
        city: formData.city,
        location: locationData!.formattedAddress,
        latitude: locationData!.latitude,
        longitude: locationData!.longitude,
        placeId: locationData!.placeId,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Registration failed')
      }

      if (result.success) {
        alert("Registration successful! You can now login.")
        router.push('/login')
      } else {
        throw new Error(result.message || 'Registration failed')
      }
      
    } catch (error) {
      console.error('Registration error:', error)
      alert(error instanceof Error ? error.message : 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <GoogleMapsProvider>
      {/* ── Video Tutorial Modal ── */}
      <VideoTutorialModal isOpen={showVideoGuide} onClose={() => setShowVideoGuide(false)} />

      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Back to Home */}
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </div>

          <Card className="shadow-2xl border-emerald-100">
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
                      <Label htmlFor="pharmacy-name">
                        Pharmacy Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="pharmacy-name"
                        type="text"
                        placeholder="e.g., Central Pharmacy"
                        className="h-11"
                        value={formData.pharmacyName}
                        onChange={(e) => handleInputChange("pharmacyName", e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="owner-name">
                        Owner/Manager Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="owner-name"
                        type="text"
                        placeholder="e.g., Dr. Chisomo Mwale"
                        className="h-11"
                        value={formData.ownerName}
                        onChange={(e) => handleInputChange("ownerName", e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="license-number">
                        Pharmacy License Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="license-number"
                        type="text"
                        placeholder="e.g., PH-MW-2024-001"
                        className="h-11"
                        value={formData.licenseNumber}
                        onChange={(e) => handleInputChange("licenseNumber", e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">
                        City/Area <span className="text-red-500">*</span>
                      </Label>
                      <Select 
                        onValueChange={(value) => handleInputChange("city", value)}
                        disabled={isLoading}
                        required
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select your city" />
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

                  {/* Location Picker — wrap in a div and add the Guide button */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Pharmacy Location (Map Pin) <span className="text-red-500">*</span>
                      </Label>
                      {/* ── Guide Circle Button ── */}
                      <button
                        type="button"
                        onClick={() => setShowVideoGuide(true)}
                        className="group flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 hover:border-emerald-300 transition-all duration-200 shadow-sm"
                        title="Watch video guide"
                      >
                        <div className="w-4 h-4 rounded-full bg-emerald-500 group-hover:bg-emerald-600 flex items-center justify-center transition-colors flex-shrink-0">
                          <Play className="h-2.5 w-2.5 text-white fill-white" />
                        </div>
                        <span className="text-xs font-medium text-emerald-700 group-hover:text-emerald-800 transition-colors whitespace-nowrap">
                          Guide
                        </span>
                      </button>
                    </div>
                    <LocationPicker
                      onLocationSelect={handleLocationSelect}
                      error={locationError}
                    />
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
                      <Label htmlFor="email">
                        Email Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="pharmacy@example.com"
                        className="h-11"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+265 1 234 567"
                        className="h-11"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        required
                        disabled={isLoading}
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
                      <Label htmlFor="password">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a strong password (min. 8 characters)"
                          className="h-11 pr-10"
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          required
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-11 w-11"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      {/* Password Strength Indicator */}
                      {formData.password && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                                style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                              />
                            </div>
                            <span className="ml-2 text-xs font-medium">
                              {passwordStrength.message}
                            </span>
                          </div>
                          
                          {/* Password Requirements Checklist */}
                          <div className="grid grid-cols-1 gap-1 mt-2 text-xs">
                            <div className="flex items-center space-x-2">
                              {passwordStrength.requirements.length ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-gray-400" />
                              )}
                              <span className={passwordStrength.requirements.length ? "text-green-600" : "text-gray-500"}>
                                At least 8 characters
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {passwordStrength.requirements.uppercase ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-gray-400" />
                              )}
                              <span className={passwordStrength.requirements.uppercase ? "text-green-600" : "text-gray-500"}>
                                One uppercase letter
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {passwordStrength.requirements.lowercase ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-gray-400" />
                              )}
                              <span className={passwordStrength.requirements.lowercase ? "text-green-600" : "text-gray-500"}>
                                One lowercase letter
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {passwordStrength.requirements.number ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-gray-400" />
                              )}
                              <span className={passwordStrength.requirements.number ? "text-green-600" : "text-gray-500"}>
                                One number
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {passwordStrength.requirements.special ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-gray-400" />
                              )}
                              <span className={passwordStrength.requirements.special ? "text-green-600" : "text-gray-500"}>
                                One special character (!@#$%^&*)
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500 mt-1">
                        Use a strong password to keep your account secure
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">
                        Confirm Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          className={`h-11 pr-10 ${
                            formData.confirmPassword && formData.password !== formData.confirmPassword
                              ? "border-red-500 focus-visible:ring-red-500"
                              : formData.confirmPassword && formData.password === formData.confirmPassword
                              ? "border-green-500 focus-visible:ring-green-500"
                              : ""
                          }`}
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                          required
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-11 w-11"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">
                          Passwords do not match
                        </p>
                      )}
                      {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password && (
                        <p className="text-xs text-green-500 mt-1">
                          ✓ Passwords match
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* CAPTCHA */}
                <div className="space-y-4">
                  <Label>Security Verification <span className="text-red-500">*</span></Label>
                  <div className="flex justify-center">
                    <ReCAPTCHA
                      sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
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
                    disabled={isLoading}
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
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
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
                <p>📍 Precise location helps customers find your pharmacy</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </GoogleMapsProvider>
  )
}