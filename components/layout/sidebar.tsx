"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { AlertTriangle, BarChart3, Map, Navigation, Settings, LogOut, Camera, Route } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: Map,
  },
  {
    label: "Incidents",
    href: "/incidents",
    icon: AlertTriangle,
  },
  {
    label: "Delayed Routes",
    href: "/routes",
    icon: Navigation,
  },
  {
    label: "Smart Routes",
    href: "/route-suggestion",
    icon: Route,
  },
  {
    label: "CCTV Monitoring",
    href: "/cctv",
    icon: Camera,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-primary flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-sidebar-primary/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          GridLock
        </h1>
        {user && (
          <p className="text-xs text-sidebar-foreground/60 mt-2">
            {user.name} • {user.role}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                isActive
                  ? "bg-sidebar-primary/20 text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/10",
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/10 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
