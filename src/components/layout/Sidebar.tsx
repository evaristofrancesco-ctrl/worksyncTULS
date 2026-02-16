"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Clock, 
  FileText, 
  MapPin,
  Layers,
  HelpCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

const adminLinks = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Dipendenti", href: "/admin/employees", icon: Users },
  { name: "Sedi Operative", href: "/admin/locations", icon: MapPin },
  { name: "Turni", href: "/admin/shifts", icon: Calendar },
  { name: "Presenze", href: "/admin/attendance", icon: Clock },
  { name: "Richieste", href: "/admin/requests", icon: FileText },
]

const employeeLinks = [
  { name: "Dashboard", href: "/employee", icon: LayoutDashboard },
  { name: "I Miei Turni", href: "/employee/shifts", icon: Calendar },
  { name: "Presenze", href: "/employee/attendance", icon: Clock },
  { name: "Le Mie Richieste", href: "/employee/requests", icon: FileText },
]

export function Sidebar({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const pathname = usePathname()
  const links = role === 'ADMIN' ? adminLinks : employeeLinks

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card hidden lg:block">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">T</div>
          <span className="text-xl font-bold tracking-tight text-primary">TU.L.S.</span>
        </Link>
      </div>
      <div className="flex flex-col justify-between h-[calc(100vh-64px)] p-4">
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.name}
              </Link>
            )
          })}
        </nav>
        
        <div className="space-y-1 pt-4 border-t">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Layers className="h-4 w-4" />
            Impostazioni
          </Link>
          <Link
            href="/help"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" />
            Supporto
          </Link>
        </div>
      </div>
    </aside>
  )
}
