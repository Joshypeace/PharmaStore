"use client"

import { Bell, User, LogOut, CreditCard, Settings, Crown, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!session) {
    return (
      <header className="bg-gradient-to-r from-white to-slate-50/80 backdrop-blur-sm shadow-lg shadow-slate-200/30 border-b border-slate-200/50 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Dashboard</h2>
            <p className="text-sm text-slate-500">Loading...</p>
          </div>
        </div>
      </header>
    );
  }

  const userName = session.user?.name ?? "User";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  return (
    <header className="bg-gradient-to-r from-white to-slate-50/80 backdrop-blur-sm shadow-lg shadow-slate-200/30 border-b border-slate-200/50 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section - Title and User Info */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Mobile Menu Button - Only show on small screens */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-200 rounded-xl"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-col">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Dashboard</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-slate-500 hidden xs:block">Welcome, {userName}!</p>
              {/* <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs py-1">
                <Crown className="h-3 w-3 mr-1 hidden xs:inline" />
                7 days left
              </Badge> */}
            </div>
          </div>
        </div>

        {/* Right Section - Actions and User Menu */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-200 rounded-xl"
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-xs bg-gradient-to-r from-red-500 to-red-600 shadow-lg">
              5
            </Badge>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-2 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-200 rounded-xl min-w-0"
              >
                {/* Avatar with user initial */}
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                  <span className="text-white text-sm font-medium hidden xs:block">
                    {userInitial}
                  </span>
                  <User className="h-4 w-4 text-white xs:hidden" />
                </div>
                <span className="hidden md:block font-medium text-sm sm:text-base truncate max-w-32">
                  {userName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{userInitial}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">{userName}</span>
                  <span className="text-xs text-slate-500">7 days trial left</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/users" className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              {/* <DropdownMenuItem asChild>
                <Link href="/billing" className="flex items-center cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing & Subscription
                </Link>
              </DropdownMenuItem> */}
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-lg z-40">
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">{userInitial}</span>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{userName}</p>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs mt-1">
                  <Crown className="h-3 w-3 mr-1" />
                  7 days trial
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link href="/users" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Link href="/billing" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing
                </Button>
              </Link>
              <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}