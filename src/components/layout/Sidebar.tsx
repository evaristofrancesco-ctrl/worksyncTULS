
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
  HelpCircle,
  History,
  ClipboardList,
  ArrowLeftRight
} from "lucide-react"
import { cn } from "@/lib/utils"

const adminLinks = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Dipendenti", href: "/admin/employees", icon: Users },
  { name: "Sedi Operative", href: "/admin/locations", icon: MapPin },
  { name: "Turni Team", href: "/admin/shifts", icon: Calendar },
  { name: "⏱️ Registro Presenze", href: "/admin/attendance", icon: Clock },
  { name: "Richieste Team", href: "/admin/requests", icon: FileText },
  { name: "Gestione Modifiche", href: "/admin/modifications", icon: ArrowLeftRight },
]

const adminPersonalLinks = [
  { name: "Miei Turni", href: "/employee/shifts", icon: History },
  { name: "Mie Presenze", href: "/employee/attendance", icon: History },
  { name: "Mie Richieste", href: "/employee/requests", icon: History },
  { name: "Nuova Modifica", href: "/employee/modification-requests", icon: ClipboardList },
]

const employeeLinks = [
  { name: "Dashboard", href: "/employee", icon: LayoutDashboard },
  { name: "I Miei Turni", href: "/employee/shifts", icon: Calendar },
  { name: "Le Mie Presenze", href: "/employee/attendance", icon: Clock },
  { name: "Le Mie Richieste", href: "/employee/requests", icon: FileText },
  { name: "Richiesta Modifica", href: "/employee/modification-requests", icon: ClipboardList },
]

export function Sidebar({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const pathname = usePathname()
  const links = role === 'ADMIN' ? adminLinks : employeeLinks

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card hidden lg:block overflow-y-auto">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">T</div>
          <span className="text-xl font-black tracking-tighter text-primary">TU.L.S.</span>
        </Link>
      </div>
      <div className="flex flex-col p-4 space-y-6">
        <nav className="space-y-1">
          <div className="px-3 mb-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Azienda</div>
          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold transition-all",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.name}
              </Link>
            )
          })}
        </nav>

        {role === 'ADMIN' && (
          <nav className="space-y-1">
            <div className="px-3 mb-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest border-t pt-4">Le Mie Attività</div>
            {adminPersonalLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold transition-all",
                    isActive 
                      ? "bg-amber-500 text-white shadow-md" 
                      : "text-muted-foreground hover:bg-amber-50 hover:text-amber-700"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              )
            })}
          </nav>
        )}
        
        <div className="space-y-1 pt-4 border-t">
          <Link
            href="/admin/settings"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Layers className="h-4 w-4" />
            Impostazioni
          </Link>
          <Link
            href="/help"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" />
            Supporto
          </Link>
        </div>
      </div>
    </aside>
  )
}
