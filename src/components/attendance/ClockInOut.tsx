"use client"

import { useState, useEffect } from "react"
import { Clock, Play, Square, MapPin, Loader2, Zap, Hourglass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function ClockInOut() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [time, setTime] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState("00:00:00")
  const [isProcessing, setIsProcessing] = useState(false)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setEmployeeId(localStorage.getItem("employeeId"))
    setUserName(localStorage.getItem("userName"))
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const entriesQuery = useMemoFirebase(() => {
    if (!db || !employeeId) return null;
    return query(
      collection(db, "employees", employeeId, "timeentries"),
      orderBy("checkInTime", "desc"),
      limit(1)
    );
  }, [db, employeeId])
  
  const { data: entries, isLoading: isEntriesLoading } = useCollection(entriesQuery)
  const currentEntry = entries && entries.length > 0 ? entries[0] : null
  const isClockedIn = !!(currentEntry && !currentEntry.checkOutTime)

  useEffect(() => {
    let interval: any
    if (isClockedIn && currentEntry) {
      const startTime = new Date(currentEntry.checkInTime).getTime()
      interval = setInterval(() => {
        const diff = new Date().getTime() - startTime
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0')
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0')
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0')
        setElapsed(`${h}:${m}:${s}`)
      }, 1000)
    } else {
      setElapsed("00:00:00")
    }
    return () => clearInterval(interval)
  }, [isClockedIn, currentEntry])

  const handleClockToggle = async () => {
    if (!employeeId || !db) return;
    
    setIsProcessing(true)
    const now = new Date();
    const day = now.getDay();
    const isWeekday = day >= 1 && day <= 6; // Lun-Sab
    
    let effectiveTime = now.toISOString();
    let isAnomaly = false;

    if (isWeekday) {
      const getPrecise = (h: number, m: number) => {
        const d = new Date(now);
        d.setHours(h, m, 0, 0);
        return d;
      };

      const slots = isClockedIn 
        ? [getPrecise(13, 0), getPrecise(20, 20)] 
        : [getPrecise(9, 0), getPrecise(17, 0)];

      let minDiff = Infinity;
      let targetPrecise: Date | null = null;

      slots.forEach(s => {
        const diff = Math.abs(now.getTime() - s.getTime()) / 60000;
        if (diff < minDiff) {
          minDiff = diff;
          targetPrecise = s;
        }
      });

      if (minDiff <= 20 && targetPrecise) {
        effectiveTime = (targetPrecise as Date).toISOString();
      } else {
        isAnomaly = true;
      }
    }

    try {
      if (isClockedIn && currentEntry) {
        const entryRef = doc(db, "employees", employeeId, "timeentries", currentEntry.id)
        updateDocumentNonBlocking(entryRef, {
          checkOutTime: effectiveTime,
          isApproved: true,
          isAnomaly: isAnomaly
        })
        
        if (isAnomaly) {
          sendAdminAlert("Uscita Fuori Orario", `${userName || 'Un dipendente'} ha timbrato l'uscita alle ${now.toLocaleTimeString('it-IT')}.`);
        }
        
        toast({ title: "Uscita registrata", description: isAnomaly ? "Orario registrato con segnalazione." : "Buon riposo!" })
      } else {
        const entryId = `entry-${Date.now()}`
        const entryRef = doc(db, "employees", employeeId, "timeentries", entryId)
        setDocumentNonBlocking(entryRef, {
          id: entryId,
          employeeId: employeeId,
          companyId: "default",
          checkInTime: effectiveTime,
          isApproved: true,
          status: "PRESENT",
          type: "MANUAL",
          isAnomaly: isAnomaly
        }, { merge: true })

        if (isAnomaly) {
          sendAdminAlert("Ingresso Fuori Orario", `${userName || 'Un dipendente'} ha timbrato l'ingresso alle ${now.toLocaleTimeString('it-IT')}.`);
        }

        toast({ title: "Entrata registrata", description: isAnomaly ? "Orario registrato con segnalazione." : "Buon lavoro!" })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setTimeout(() => setIsProcessing(false), 500)
    }
  }

  const sendAdminAlert = (title: string, message: string) => {
    const notifId = `alert-${Date.now()}`;
    setDocumentNonBlocking(doc(db, "notifications", notifId), {
      id: notifId,
      recipientId: "ADMIN",
      title: `⚠️ ${title}`,
      message: message,
      type: "ATTENDANCE_ALERT",
      createdAt: new Date().toISOString(),
      isRead: false
    }, { merge: true });
  }

  return (
    <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden ring-1 ring-slate-100 flex flex-col items-center">
      <div className={cn(
        "w-full p-6 pb-8 text-center relative overflow-hidden",
        isClockedIn ? "bg-green-500" : "bg-[#1e293b]"
      )}>
        <div className="absolute top-0 left-0 p-8 opacity-10 pointer-events-none">
          <Clock className="h-24 w-24 text-white" />
        </div>
        <Badge className="bg-white/20 border-none font-black text-[9px] uppercase tracking-[0.2em] mb-3 text-white">
          Modulo Timbratura
        </Badge>
        <div className="relative z-10 flex flex-col items-center gap-1">
          <p className="text-4xl font-black font-mono tracking-tighter text-white italic">
            {mounted && time ? time.toLocaleTimeString('it-IT', { hour12: false }) : "--:--:--"}
          </p>
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">
            {mounted && time ? time.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' }) : "Caricamento"}
          </p>
        </div>
      </div>

      <CardContent className="p-8 w-full space-y-8 flex flex-col items-center mt-[-2rem] relative z-20">
        {isClockedIn && (
          <div className="bg-white rounded-[1.5rem] p-6 w-full shadow-xl ring-1 ring-slate-100 flex flex-col items-center animate-in zoom-in-75 duration-300">
             <div className="flex items-center gap-2 mb-2">
                <Hourglass className="h-3 w-3 text-green-500 animate-spin-slow" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tempo in Servizio</span>
             </div>
             <p className="text-3xl font-black font-mono text-[#1e293b] tracking-tighter">{elapsed}</p>
          </div>
        )}

        <div className="w-full space-y-4">
           {isClockedIn ? (
              <Button 
                onClick={handleClockToggle}
                disabled={isProcessing || isEntriesLoading}
                className="w-full h-20 rounded-[1.5rem] bg-white border-2 border-rose-100 text-rose-600 hover:bg-rose-50 font-black text-xl italic tracking-tighter shadow-lg shadow-rose-200/20 active:scale-95 transition-all group"
              >
                {isProcessing ? <Loader2 className="h-8 w-8 animate-spin" /> : (
                  <div className="flex items-center gap-3">
                    <Square className="h-6 w-6 fill-current group-hover:scale-110 transition-transform" /> TERMINA TURNO
                  </div>
                )}
              </Button>
           ) : (
              <Button 
                onClick={handleClockToggle}
                disabled={isProcessing || isEntriesLoading}
                className="w-full h-20 rounded-[1.5rem] bg-[#227FD8] hover:bg-[#1e293b] text-white font-black text-xl italic tracking-tighter shadow-xl shadow-blue-500/10 active:scale-95 transition-all group"
              >
                {isProcessing ? <Loader2 className="h-8 w-8 animate-spin" /> : (
                  <div className="flex items-center gap-3">
                    <Play className="h-6 w-6 fill-current group-hover:scale-110 transition-transform" /> INIZIA TURNO
                  </div>
                )}
              </Button>
           )}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
          <MapPin className="h-3.5 w-3.5 text-[#227FD8]" />
          <span>Sede Centrale - GPS Attivo</span>
        </div>
      </CardContent>
    </Card>
  )
}
