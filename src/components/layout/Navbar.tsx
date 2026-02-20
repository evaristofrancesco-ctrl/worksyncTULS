
"use client"

import { Bell, Search, User, LogOut, Settings, Loader2, Check, Inbox } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { useAuth, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { collection, query, where, limit, doc } from "firebase/firestore"
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

export function Navbar({ userName, role }: { userName: string, role: string }) {
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null)

  useEffect(() => {
    setCurrentEmployeeId(localStorage.getItem("employeeId"))
  }, [])

  // Query semplificata per evitare indici Firestore complessi e problemi di permessi
  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !currentEmployeeId || !role) return null;
    const recipient = role.toUpperCase() === 'ADMIN' ? 'ADMIN' : currentEmployeeId;
    return query(
      collection(db, "notifications"),
      where("recipientId", "in", [recipient, "ALL"]),
      limit(20)
    );
  }, [db, currentEmployeeId, role])

  const { data: rawNotifications } = useCollection(notificationsQuery)

  // Ordinamento in memoria per massimizzare la compatibilità
  const notifications = useMemo(() => {
    if (!rawNotifications) return [];
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
      <div className="flex w-full items-center gap-4">
        <div className="relative flex-1 max-w-md hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cerca dipendenti, turni..."
            className="pl-8 bg-muted/50 border-none h-9 w-full md:w-[300px] lg:w-[400px]"
          />
        </div>
        <div className="ml-auto flex items-center gap-4">
          
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
              {notifications && notifications.length > 0 && (
                <div className="p-2 border-t bg-slate-50 text-center">
                  <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-[#227FD8] h-8 w-full">Vedi tutto</Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 flex items-center gap-2 pl-1 pr-2 hover:bg-muted/50 rounded-xl transition-all">
                <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                  <AvatarImage src={`https://picsum.photos/seed/${userName}/100/100`} />
                  <AvatarFallback className="font-black">{userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-xs hidden sm:flex">
                  <span className="font-black text-slate-900 leading-none">{userName}</span>
                  <span className="text-slate-400 uppercase text-[9px] font-black tracking-widest mt-0.5">{role?.toLowerCase()}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-xl border-none">
              <DropdownMenuLabel className="font-black uppercase text-[10px] tracking-widest text-slate-400">Il Mio Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer font-bold gap-2">
                <User className="h-4 w-4 text-slate-400" /> Profilo
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer font-bold gap-2">
                <Settings className="h-4 w-4 text-slate-400" /> Impostazioni
              </DropdownMenuItem>
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
