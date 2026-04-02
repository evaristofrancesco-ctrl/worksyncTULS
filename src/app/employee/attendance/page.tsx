"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Loader2, 
  History, 
  TrendingUp, 
  Timer, 
  CheckCircle2, 
  Zap, 
  ArrowRight,
  Filter,
  Inbox
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { cn } from "@/lib/utils"

export default function EmployeeAttendancePage() {
  const db = useFirestore()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [now] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setEmployeeId(localStorage.getItem("employeeId"))
  }, [])

  const entriesQuery = useMemoFirebase(() => {
    if (!db || !employeeId) return null;
    return query(
      collection(db, "employees", employeeId, "timeentries"),
      orderBy("checkInTime", "desc"),
      limit(50)
    );
  }, [db, employeeId])

  const { data: entries, isLoading } = useCollection(entriesQuery)

  const stats = useMemo(() => {
    if (!entries) return { totalHours: 0, daysCount: 0 };
    const monthEntries = entries.filter(e => {
        const d = new Date(e.checkInTime);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    
    const totalMs = monthEntries.reduce((acc, e) => {
        const start = new Date(e.checkInTime).getTime();
        const end = e.checkOutTime ? new Date(e.checkOutTime).getTime() : now.getTime();
        return acc + (end - start);
    }, 0);

    return {
        totalHours: Math.round(totalMs / 3600000),
        daysCount: new Set(monthEntries.map(e => e.checkInTime.split('T')[0])).size
    };
  }, [entries, now]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-16">
      {/* --- HERO HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm ring-1 ring-slate-200">
        <div className="space-y-1">
          <Badge className="bg-[#227FD8]/10 text-[#227FD8] hover:bg-[#227FD8]/20 border-none px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
            Archivio Personale
          </Badge>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tighter italic">Diario Presenze</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <History className="h-3.5 w-3.5" /> 
            Storico completo delle tue ore lavorate
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right border-r border-slate-100 pr-4">
             <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Questo Mese</p>
             <p className="text-xl font-black text-[#1e293b]">{stats.totalHours}h <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tight">Totali</span></p>
          </div>
          <div className="text-right">
             <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Giorni Lavorati</p>
             <p className="text-xl font-black text-[#1e293b]">{stats.daysCount}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="flex items-center justify-between px-2">
           <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
             <Zap className="h-4 w-4 text-[#227FD8]" /> Timeline Attività
           </h2>
           <Button variant="ghost" size="sm" className="h-8 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-[#227FD8]">
             <Filter className="h-3 w-3 mr-2" /> Filtra Periodo
           </Button>
        </div>

        {isLoading ? (
          <div className="py-32 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-[#227FD8] opacity-20" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Recupero diario...</p>
          </div>
        ) : entries && entries.length > 0 ? (
          <div className="grid gap-4">
            {entries.map((req) => {
              const start = new Date(req.checkInTime);
              const end = req.checkOutTime ? new Date(req.checkOutTime) : null;
              const duration = end ? Math.round((end.getTime() - start.getTime()) / 3600000 * 10) / 10 : null;
              
              return (
                <div key={req.id} className="group relative bg-white rounded-[2rem] p-5 shadow-sm ring-1 ring-slate-200 hover:shadow-xl hover:ring-[#227FD8]/20 transition-all duration-300 overflow-hidden">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                         <div className={cn(
                           "h-14 w-14 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-6",
                           end ? 'bg-[#1e293b]' : 'bg-green-500'
                         )}>
                           <span className="text-lg font-black leading-none">{start.toLocaleDateString('it-IT', { day: '2-digit' })}</span>
                           <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{start.toLocaleDateString('it-IT', { month: 'short' })}</span>
                         </div>
                         <div>
                            <div className="flex items-center gap-2">
                               <h3 className="text-lg font-black text-[#1e293b] tracking-tight italic">
                                 {end ? 'Turno Completato' : 'In Servizio'}
                               </h3>
                               {!end && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                 <Clock className="h-3 w-3" /> 
                                 {start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} 
                                 {end && ` - ${end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
                               </p>
                               <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-slate-100 bg-slate-50 text-slate-400 px-2">
                                 <MapPin className="h-2 w-2 mr-1" /> Sede Centrale
                               </Badge>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center gap-6">
                         {duration !== null && (
                           <div className="text-right">
                              <p className="text-[9px] font-black uppercase text-slate-300 tracking-widest mb-0.5">Durata</p>
                              <p className="text-lg font-black text-[#227FD8] italic">{duration}h</p>
                           </div>
                         )}
                         <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-200 group-hover:bg-[#227FD8]/5 group-hover:text-[#227FD8] transition-colors">
                           <ArrowRight className="h-4 w-4" />
                         </div>
                      </div>
                   </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-40 text-center bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200">
             <div className="h-24 w-24 bg-white rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl border border-slate-100 mb-8">
               <Inbox className="h-12 w-12 text-slate-50" />
             </div>
             <h3 className="text-2xl font-black text-[#1e293b] tracking-tight italic">Ancora nessuna presenza?</h3>
             <p className="text-slate-400 font-medium text-sm mt-3 max-w-xs mx-auto">
               Inizia a registrare il tuo tempo lavorativo dalla dashboard per vedere apparire il tuo diario qui.
             </p>
          </div>
        )}
      </div>
    </div>
  )
}
