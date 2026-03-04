
"use client"

import { useState, useEffect } from "react"
import { Clock, Play, Square, MapPin, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"

export function ClockInOut() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [time, setTime] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState("00:00:00")
  const [isProcessing, setIsProcessing] = useState(false)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
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

      // Definizione slot aggiornata: Mattina (09:00-13:00) e Pomeriggio (17:00-20:20)
      // Usiamo 17:00 per garantire il totale di 7h 20m giornaliere.
      const slots = isClockedIn 
        ? [getPrecise(13, 0), getPrecise(20, 20)] // Slot per uscita
        : [getPrecise(9, 0), getPrecise(17, 0)]; // Slot per entrata

      let minDiff = Infinity;
      let targetPrecise: Date | null = null;

      slots.forEach(s => {
        const diff = Math.abs(now.getTime() - s.getTime()) / 60000;
        if (diff < minDiff) {
          minDiff = diff;
          targetPrecise = s;
        }
      });

      // Arrotondamento 20 minuti (prima e dopo)
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
      setTimeout(() => setIsProcessing(false), 1000)
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
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Timbratura
          </CardTitle>
          <Badge variant={isClockedIn ? "default" : "secondary"} className={isClockedIn ? "bg-green-500" : ""}>
            {isClockedIn ? "In Servizio" : "Offline"}
          </Badge>
        </div>
        <CardDescription>Registra le tue ore di lavoro per oggi.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center py-6 gap-6">
        <div className="text-center">
          <p className="text-4xl font-mono font-bold tracking-tighter text-primary">
            {time ? time.toLocaleTimeString('it-IT', { hour12: false }) : "00:00:00"}
          </p>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {time ? time.toLocaleDateString('it-IT', { weekday: 'long', month: 'long', day: 'numeric' }) : "Caricamento..."}
          </p>
        </div>

        {isClockedIn && (
          <div className="bg-white dark:bg-slate-900 rounded-lg p-3 w-full border text-center shadow-sm animate-pulse">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Tempo Trascorso</p>
            <p className="text-2xl font-mono font-bold text-[#1e293b]">{elapsed}</p>
          </div>
        )}

        <div className="flex gap-4 w-full">
          <Button 
            onClick={handleClockToggle}
            disabled={isProcessing || isEntriesLoading}
            className={`flex-1 h-12 gap-2 text-lg font-bold shadow-md transition-all ${isClockedIn ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}`}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isClockedIn ? (
              <><Square className="h-5 w-5 fill-current" /> Uscita</>
            ) : (
              <><Play className="h-5 w-5 fill-current" /> Entrata</>
            )}
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic">
          <MapPin className="h-3 w-3" />
          <span>Sede Centrale - Arrotondamento 20m attivo</span>
        </div>
      </CardContent>
    </Card>
  )
}
