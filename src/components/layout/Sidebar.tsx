
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
  ClipboardList,
  ArrowLeftRight,
  Info,
  UserCircle,
  Briefcase
} from "lucide-react"
import { cn } from "@/lib/utils"

const adminLinks = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Dipendenti", href: "/admin/employees", icon: Users },
  { name: "Sedi", href: "/admin/locations", icon: MapPin },
  { name: "Turni Team", href: "/admin/shifts", icon: Calendar },
  { name: "Presenze", href: "/admin/attendance", icon: Clock },
  { name: "Richieste", href: "/admin/requests", icon: FileText },
  { name: "Modifiche", href: "/admin/modifications", icon: ArrowLeftRight },
  { name: "UTILITY", href: "/admin/utilities", icon: Info },
]

const adminPersonalLinks = [
  { name: "Miei Turni", href: "/employee/shifts", icon: Calendar },
  { name: "Mie Presenze", href: "/employee/attendance", icon: Clock },
  { name: "Mie Richieste", href: "/employee/requests", icon: FileText },
  { name: "Nuova Modifica", href: "/employee/modification-requests", icon: ClipboardList },
  { name: "UTILITY", href: "/employee/utilities", icon: Info },
]

const employeeLinks = [
  { name: "Dashboard", href: "/employee", icon: LayoutDashboard },
  { name: "I Miei Turni", href: "/employee/shifts", icon: Calendar },
  { name: "Le Mie Presenze", href: "/employee/attendance", icon: Clock },
  { name: "Le Mie Richieste", href: "/employee/requests", icon: FileText },
  { name: "Richiesta Modifica", href: "/employee/modification-requests", icon: ClipboardList },
  { name: "UTILITY", href: "/employee/utilities", icon: Info },
]

export function Sidebar({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const pathname = usePathname()
  const isAdmin = role === 'ADMIN'
  const mainLinks = isAdmin ? adminLinks : employeeLinks

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r bg-card hidden lg:block overflow-y-auto shadow-sm">
      <div className="flex h-14 items-center border-b px-5 bg-white/50 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">T</div>
          <span className="text-lg font-black tracking-tighter text-primary">TU.L.S.</span>
        </Link>
      </div>

      <div className="flex flex-col p-3 space-y-6">
        <nav className="space-y-0.5">
          <div className="px-3 mb-2 flex items-center gap-2 text-[9px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
            <Briefcase className="h-3 w-3" />
            {isAdmin ? "Gestione Aziendale" : "Attività Aziendali"}
          </div>
          <div className="space-y-0.5">
            {mainLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {isAdmin && (
          <nav className="space-y-0.5 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50">
            <div className="px-1 mb-2 flex items-center gap-2 text-[9px] font-black uppercase text-amber-700/70 tracking-widest">
              <UserCircle className="h-3 w-3" />
              La Mia Area
            </div>
            <div className="space-y-0.5">
              {adminPersonalLinks.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all duration-200",
                      isActive 
                        ? "bg-amber-500 text-white shadow-sm" 
                        : "text-muted-foreground hover:bg-amber-100/50 hover:text-amber-800"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {link.name}
                  </Link>
                )
              })}
            </div>
          </nav>
        )}
        
        <div className="space-y-0.5 pt-4 border-t mt-auto">
          <Link
            href="/admin/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              pathname === "/admin/settings" ? "bg-slate-100 text-slate-900" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Impostazioni
          </Link>
          <Link
            href="/help"
            className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Supporto
          </Link>
        </div>
      </div>
    </aside>
  )
}
