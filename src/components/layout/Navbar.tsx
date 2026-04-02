
"use client"

import { Bell, Search, User, LogOut, Settings, Loader2, Check, Inbox, Menu, LayoutDashboard, Users, MapPin, Calendar, Clock, FileText, ArrowLeftRight, Calculator, Info, ClipboardList, UserCircle, FolderOpen } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { collection, query, where, limit, doc, orderBy } from "firebase/firestore"
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import Link from "next/link"
import { cn } from "@/lib/utils"

const adminLinks = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Dipendenti", href: "/admin/employees", icon: Users },
  { name: "Sedi", href: "/admin/locations", icon: MapPin },
  { name: "Turni Team", href: "/admin/shifts", icon: Calendar },
  { name: "Presenze", href: "/admin/attendance", icon: Clock },
  { name: "Richieste", href: "/admin/requests", icon: FileText },
  { name: "Modifiche", href: "/admin/modifications", icon: ArrowLeftRight },
  { name: "Conteggio", href: "/admin/reports", icon: Calculator },
  { name: "Documenti", href: "/admin/documents", icon: FolderOpen },
  { name: "UTILITY", href: "/admin/utilities", icon: Info },
]

const adminPersonalLinks = [
  { name: "I Miei Turni", href: "/admin/my-shifts", icon: Calendar },
  { name: "Le Mie Presenze", href: "/admin/my-attendance", icon: Clock },
]

const employeeLinks = [
  { name: "Dashboard", href: "/employee", icon: LayoutDashboard },
  { name: "I Miei Turni", href: "/employee/shifts", icon: Calendar },
  { name: "Le Mie Presenze", href: "/employee/attendance", icon: Clock },
  { name: "Le Mie Richieste", href: "/employee/requests", icon: FileText },
  { name: "Entra/Esce", href: "/employee/modification-requests", icon: ClipboardList },
  { name: "Documenti", href: "/employee/documents", icon: FolderOpen },
  { name: "UTILITY", href: "/employee/utilities", icon: Info },
]

export function Navbar({ userName, role }: { userName: string, role: string }) {
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    setCurrentEmployeeId(localStorage.getItem("employeeId"))
  }, [])

  const employeeRef = useMemo(() => {
    if (!db || !currentEmployeeId) return null;
    return doc(db, "employees", currentEmployeeId);
  }, [db, currentEmployeeId]);

  const { data: employeeData } = useDoc(employeeRef);

  const isAdmin = role.toUpperCase() === 'ADMIN'
  const navLinks = isAdmin ? adminLinks : employeeLinks

  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !role) return null;
    
    // Per gli Admin, cerchiamo 'ADMIN' o 'ALL'. Per i dipendenti, il loro ID o 'ALL'.
    const recipient = isAdmin ? 'ADMIN' : currentEmployeeId;
    if (!recipient) return null;

    return query(
      collection(db, "notifications"),
      where("recipientId", "in", [recipient, "ALL"]),
      limit(50) 
    );
  }, [db, currentEmployeeId, role, isAdmin])

  const { data: rawNotifications } = useCollection(notificationsQuery)

  const notifications = useMemo(() => {
    if (!rawNotifications) return [];
    // Ordinamento client-side per garantire che le più recenti siano in alto
    return [...rawNotifications].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [rawNotifications]);

  const unreadCount = useMemo(() => {
    return notifications?.filter(n => !n.isRead).length || 0;
  }, [notifications])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut(auth)
      localStorage.removeItem("userRole")
      localStorage.removeItem("userName")
      localStorage.removeItem("employeeId")
      
      toast({
        title: "Disconnesso",
        description: "Sessione terminata con successo.",
      })
      router.push("/")
    } catch (error) {
      console.error("Logout Error:", error)
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile disconnettersi.",
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const markAsRead = (id: string) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "notifications", id), { isRead: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <div className="flex w-full items-center gap-4">
        {/* Mobile Menu Trigger */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden h-10 w-10">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 border-none shadow-2xl">
            <SheetHeader className="p-6 border-b bg-primary text-primary-foreground text-left">
              <SheetTitle className="text-white flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-primary font-black">T</div>
                <span className="font-black tracking-tighter">TU.L.S.</span>
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-80px)] p-4">
              <div className="space-y-6">
                <nav className="space-y-1">
                  <div className="px-3 mb-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
                    {isAdmin ? "Gestione Aziendale" : "Attività Aziendali"}
                  </div>
                  {navLinks.map((link) => {
                    const Icon = link.icon
                    const isActive = pathname === link.href
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-all",
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-md" 
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {link.name}
                      </Link>
                    )
                  })}
                </nav>

                {isAdmin && (
                  <nav className="space-y-1 pt-4">
                    <div className="px-3 mb-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
                      La Mia Area
                    </div>
                    {adminPersonalLinks.map((link) => {
                      const Icon = link.icon
                      const isActive = pathname === link.href
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-all",
                            isActive 
                              ? "bg-primary text-primary-foreground shadow-md" 
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          {link.name}
                        </Link>
                      )
                    })}
                  </nav>
                )}

                <div className="pt-4 border-t">
                   <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-3 text-destructive font-black h-12 px-3 rounded-xl"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                   >
                     {isLoggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                     DISCONNETTI
                   </Button>
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <div className="relative flex-1 max-w-md hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cerca..."
            className="pl-8 bg-muted/50 border-none h-9 w-full md:w-[300px]"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 md:gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-10 w-10">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-[10px] font-black border-2 border-white">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 shadow-2xl border-none overflow-hidden">
              <div className="bg-[#227FD8] p-4 text-white">
                <h3 className="font-black uppercase tracking-widest text-sm flex items-center justify-between">
                  Notifiche
                  <span className="text-[10px] opacity-70">{unreadCount} nuove</span>
                </h3>
              </div>
              <ScrollArea className="h-80">
                {notifications && notifications.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-4 hover:bg-slate-50 transition-colors group cursor-pointer ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
                        onClick={() => markAsRead(notif.id)}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <p className={`text-xs font-black uppercase ${!notif.isRead ? 'text-[#227FD8]' : 'text-slate-500'}`}>
                            {notif.title}
                          </p>
                          {!notif.isRead && (
                            <div className="h-2 w-2 rounded-full bg-[#227FD8] shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-normal font-medium">{notif.message}</p>
                        <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tight">
                          {new Date(notif.createdAt).toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-40">
                    <Inbox className="h-10 w-10 mb-2" />
                    <p className="text-xs font-black uppercase">Nessun avviso</p>
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 flex items-center gap-2 px-1 hover:bg-muted/50 rounded-xl transition-all">
                <Avatar className="h-8 w-8 border-2 border-white shadow-sm overflow-hidden">
                  <AvatarImage src={employeeData?.photoUrl || `https://picsum.photos/seed/${userName}/100/100`} className="object-cover" />
                  <AvatarFallback className="font-black text-[10px] bg-slate-800 text-white">{userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-xs hidden sm:flex pr-2">
                  <span className="font-black text-slate-900 leading-none">{userName.split(' ')[0]}</span>
                  <span className="text-slate-400 uppercase text-[8px] font-black tracking-widest mt-0.5">{role}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-xl border-none">
              <DropdownMenuLabel className="font-black uppercase text-[10px] tracking-widest text-slate-400">Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer font-bold gap-2"><User className="h-4 w-4" /> Profilo</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer font-bold gap-2"><Settings className="h-4 w-4" /> Impostazioni</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive cursor-pointer font-black gap-2" 
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                DISCONNETTI
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
