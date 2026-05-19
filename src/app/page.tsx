// app/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Star,
  Pill,
  Package,
  CheckCircle,
  Baseline as ChartLine,
  Smartphone,
  Menu,
  X,
  Search,
  Navigation,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const features = [
  {
    icon: Package,
    title: "Smart Inventory Management",
    description:
      "Real-time tracking of all medications with automatic low-stock alerts and expiration date monitoring.",
    delay: "100",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics & Reports",
    description: "Comprehensive sales reports with daily, weekly, and monthly breakdowns for better business insights.",
    delay: "200",
  },
  {
    icon: Smartphone,
    title: "Mobile Management",
    description: "Monitor your pharmacy operations from anywhere with our responsive web application.",
    delay: "300",
  },
]

const testimonials = [
  {
    name: "Dr. Chisomo Mwale",
    role: "Chief Pharmacist, Central Pharmacy",
    content:
      "PharmaStore has revolutionized how we manage our pharmacy. The inventory alerts alone have saved us thousands in expired medications.",
    rating: 5,
    delay: "100",
  },
  {
    name: "Jane Phiri",
    role: "Pharmacy Technician, HealthCare Plus",
    content:
      "The user interface is so intuitive. Our staff learned the system in just a few days. Customer service has improved significantly.",
    rating: 5,
    delay: "200",
  },
  {
    name: "Peter Banda",
    role: "Pharmacy Owner, MedSupply Co",
    content:
      "The reporting features give me insights I never had before. I can now make informed decisions about stock purchases and staffing.",
    rating: 5,
    delay: "300",
  },
]

const stats = [
  { number: "500+", label: "Pharmacies Served" },
  { number: "50K+", label: "Prescriptions Processed" },
  { number: "99.9%", label: "Uptime Guarantee" },
  { number: "24/7", label: "Support Available" },
]

const benefits = [
  "Secure cloud-based storage",
  "Multi-user access with different permission levels",
  "Regular automatic backups",
  "Compliance with Malawi healthcare regulations",
]

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Initialize scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in")
        }
      })
    }, observerOptions)

    // Observe all elements with data-animate attribute
    document.querySelectorAll("[data-animate]").forEach((el) => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm shadow-lg shadow-slate-200/50 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-200/50 transform hover:scale-110 transition-transform duration-300">
                <Pill className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  PharmaStore
                </h1>
                <p className="text-xs text-slate-500 font-medium hidden sm:block">Pharmacy Management System</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <a
                href="#features"
                className="text-slate-600 hover:text-emerald-600 transition-colors duration-300 font-medium"
              >
                Features
              </a>
              <a
                href="#about"
                className="text-slate-600 hover:text-emerald-600 transition-colors duration-300 font-medium"
              >
                About
              </a>
              <Link href="/login">
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-200/50 rounded-xl transform hover:scale-105 transition-all duration-300">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              <Link href="/login">
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-200/50 rounded-xl transform hover:scale-105 transition-all duration-300 text-sm px-3">
                  Sign In
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMobileMenu}
                className="text-slate-600 hover:text-slate-900 transition-colors duration-300"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          <div
            className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
              isMobileMenuOpen ? "max-h-96 opacity-100 py-4" : "max-h-0 opacity-0"
            }`}
          >
            <div className="flex flex-col space-y-4 border-t border-slate-200 pt-4">
              <a
                href="#features"
                className="text-slate-600 hover:text-emerald-600 transition-colors duration-300 font-medium py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#about"
                className="text-slate-600 hover:text-emerald-600 transition-colors duration-300 font-medium py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </a>
              <Link href="/login" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-12 md:py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div
              data-animate="fade-right"
              className="opacity-0 translate-x-[-50px] transition-all duration-1000 ease-out order-2 md:order-1"
            >
              <Badge className="mb-4 md:mb-6 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200 hover:scale-105 transition-transform duration-300 text-xs md:text-sm">
                🏥 Trusted by 500+ Pharmacies in Malawi
              </Badge>
              <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold text-slate-900 leading-tight mb-4 md:mb-6">
                Find Medicines Near You
                <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Instantly
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 mb-6 md:mb-8 leading-relaxed">
                Search for any medicine and find nearby pharmacies that have it in stock. Get directions and travel distance instantly.
              </p>
              
              {/* Search Button */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <Link href="/search" className="flex-1">
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-xl shadow-emerald-200/50 rounded-xl px-4 md:px-8 py-3 md:py-4 text-lg transform hover:scale-105 transition-all duration-300"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Search Medicine
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 md:gap-4">
                <Link href="/register" className="flex-1">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full rounded-xl px-4 md:px-8 py-3 md:py-4 text-lg border-2 border-emerald-300 hover:border-emerald-400 hover:bg-emerald-50 bg-transparent transition-all duration-300"
                  >
                    Register Your Pharmacy
                  </Button>
                </Link>
              </div>
            </div>
            <div
              data-animate="fade-left"
              className="opacity-0 translate-x-[50px] transition-all duration-1000 ease-out delay-200 relative order-1 md:order-2 mb-8 md:mb-0"
            >
              <img
                src="/medicines.jpg"
                alt="Modern pharmacy interior with organized medicine shelves"
                className="rounded-2xl shadow-2xl border-4 md:border-8 border-white transform md:rotate-2 hover:rotate-0 transition-transform duration-500 w-full"
              />
              <div className="absolute -bottom-4 -left-2 md:-bottom-6 md:-left-6 bg-white p-3 md:p-4 rounded-xl shadow-xl transform hover:scale-110 transition-transform duration-300 max-w-[180px] md:max-w-none">
                <div className="flex items-center">
                  <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-2 md:p-3 rounded-full mr-2 md:mr-3">
                    <Navigation className="h-4 w-4 md:h-6 md:w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm md:text-base">Nearby Pharmacies</p>
                    <p className="text-xs md:text-sm text-slate-600">Find medicines close to you</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div data-animate="fade-up" className="opacity-0 translate-y-[30px] transition-all duration-1000 ease-out">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center transform hover:scale-110 transition-transform duration-300 p-2 md:p-0"
                >
                  <div className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1 md:mb-2">
                    {stat.number}
                  </div>
                  <div className="text-slate-600 font-medium text-xs md:text-sm lg:text-base">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            data-animate="fade-up"
            className="opacity-0 translate-y-[30px] transition-all duration-1000 ease-out text-center mb-8 md:mb-16"
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Powerful Features</h2>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto px-4">
              Everything you need to efficiently manage your pharmaceutical inventory
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                data-animate="fade-up"
                className={`opacity-0 translate-y-[30px] transition-all duration-1000 ease-out bg-gradient-to-br from-emerald-50 to-teal-50 p-6 md:p-8 rounded-2xl hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300`}
                style={{ transitionDelay: `${Number.parseInt(feature.delay)}ms` }}
              >
                <div className="bg-gradient-to-br from-emerald-100 to-teal-100 w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-4 md:mb-6 transform hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-6 w-6 md:h-8 md:w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm md:text-base">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div
              data-animate="fade-right"
              className="opacity-0 translate-x-[-50px] transition-all duration-1000 ease-out order-2 md:order-1"
            >
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 md:mb-6">About PharmaStore</h2>
              <p className="text-slate-600 mb-4 md:mb-6 leading-relaxed">
                PharmaStore is a comprehensive inventory management solution designed specifically for pharmacies and
                pharmaceutical stores in Malawi. Our system helps you streamline operations, reduce errors, and improve
                customer service.
              </p>
              <p className="text-slate-600 mb-6 leading-relaxed">
                With features like barcode scanning, prescription tracking, and automated reporting, you can focus on
                what matters most - serving your customers and improving healthcare outcomes.
              </p>
              <ul className="space-y-2 md:space-y-3">
                {benefits.map((benefit, index) => (
                  <li
                    key={index}
                    className="flex items-center transform hover:translate-x-2 transition-transform duration-300"
                  >
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-emerald-600 mr-2 md:mr-3 flex-shrink-0" />
                    <span className="text-slate-700 text-sm md:text-base">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              data-animate="fade-left"
              className="opacity-0 translate-x-[50px] transition-all duration-1000 ease-out delay-200 order-1 md:order-2 mb-8 md:mb-0"
            >
              <img
                src="/pharmacist_working.jpg"
                alt="Pharmacist working with digital inventory system"
                className="rounded-2xl shadow-2xl border-4 md:border-8 border-white transform hover:scale-105 transition-transform duration-500 w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            data-animate="fade-up"
            className="opacity-0 translate-y-[30px] transition-all duration-1000 ease-out text-center mb-8 md:mb-16"
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Trusted by Healthcare Professionals
            </h2>
            <p className="text-lg md:text-xl text-slate-600 px-4">
              See what pharmacy professionals across Malawi are saying about PharmaStore
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                data-animate="fade-up"
                className={`opacity-1 translate-y-[30px] transition-all duration-1000 ease-out card-enhanced hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300`}
                style={{ transitionDelay: `${Number.parseInt(testimonial.delay)}ms` }}
              >
                <CardContent className="pt-4 md:pt-6">
                  <div className="flex mb-3 md:mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 md:h-5 md:w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-700 mb-4 md:mb-6 italic leading-relaxed text-sm md:text-base">{`"${testimonial.content}"`}</p>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm md:text-base">{testimonial.name}</p>
                    <p className="text-xs md:text-sm text-slate-600">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 bg-gradient-to-r from-emerald-600 to-teal-600 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div data-animate="fade-up" className="opacity-0 translate-y-[30px] transition-all duration-1000 ease-out">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6">
              Ready to Transform Your Pharmacy?
            </h2>
            <p className="text-lg md:text-xl mb-6 md:mb-8 max-w-3xl mx-auto opacity-90 leading-relaxed px-4">
              Join hundreds of pharmacies across Malawi who trust PharmaStore for their inventory management needs. 
            </p>
            <Link href="/register">
              <Button
                size="lg"
                className="bg-white text-emerald-600 hover:bg-gray-100 px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold rounded-xl shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                 Get Started
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                  <Pill className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">PharmaStore</h3>
                  <p className="text-xs text-slate-400 hidden md:block">Pharmacy Management</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                The complete inventory management solution for modern pharmacies in Malawi.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Quick Links</h4>
              <ul className="space-y-1 md:space-y-2 text-xs md:text-sm">
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors duration-300">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white transition-colors duration-300">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#about" className="text-slate-400 hover:text-white transition-colors duration-300">
                    About
                  </a>
                </li>
                <li>
                  <Link href="/login" className="text-slate-400 hover:text-white transition-colors duration-300">
                    Login
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Product</h4>
              <ul className="space-y-1 md:space-y-2 text-xs md:text-sm">
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white transition-colors duration-300">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors duration-300">
                    Demo
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors duration-300">
                    API
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Support</h4>
              <ul className="space-y-1 md:space-y-2 text-xs md:text-sm">
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors duration-300">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors duration-300">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors duration-300">
                    Training
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors duration-300">
                    Status
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-6 md:mt-8 pt-6 md:pt-8 text-center text-xs md:text-sm text-slate-400">
            <p>&copy; 2026 PharmaStore. All rights reserved. Made with ❤️ for Malawi healthcare.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .animate-in {
          opacity: 1 !important;
          transform: translateX(0) translateY(0) !important;
        }
      `}</style>
    </div>
  )
}