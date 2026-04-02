"use client"

import { Calendar, Clock, FileText, Gift, Info, Loader2, ClipboardList, ArrowRight, Zap, Target, TrendingUp, Sparkles, History, LayoutGrid } from "lucide-react"
import { ClockInOut } from "@/components/attendance/ClockInOut"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { useMemo, useState, useEffect } from "react"
import { startOfWeek } from "date-fns"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function EmployeeDashboard() {
  const { user } = useUser()
  const db = useFirestore()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setEmployeeId(localStorage.getItem("employeeId"))
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const employeeRef = useMemoFirebase(() => {
    if (!db || !employeeId) return null;
    return doc(db, "employees", employeeId);
  }, [db, employeeId])
  const { data: employeeDoc } = useDoc(employeeRef);

  const shiftsQuery = useMemoFirebase(() => {
    if (!db || !employeeId) return null;
    return collection(db, "employees", employeeId, "shifts");
  }, [db, employeeId])
  const { data: shifts, isLoading: isShiftsLoading } = useCollection(shiftsQuery)

  const entriesQuery = useMemoFirebase(() => {
    if (!db || !employeeId) return null;
    return query(collection(db, "employees", employeeId, "timeentries"), orderBy("checkInTime", "desc"));
  }, [db, employeeId])
  const { data: allEntries, isLoading: isEntriesLoading } = useCollection(entriesQuery)

  const recentEntries = useMemo(() => {
    if (!allEntries) return [];
    return allEntries.slice(0, 4);
  }, [allEntries]);

  const todayShift = useMemo(() => {
    if (!shifts) return null;
    const todayStr = now.toISOString().split('T')[0];
    return shifts.find(s => s.date === todayStr);
  }, [shifts, now]);

  const myGoal = useMemo(() => employeeDoc?.weeklyHours || 40, [employeeDoc]);

  const myWeeklyHours = useMemo(() => {
    if (!allEntries || !employeeId) return 0;
    
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    monday.setHours(0, 0, 0, 0);

    const weeklyEntries = allEntries.filter(e => {
      const entryDate = new Date(e.checkInTime);
      return entryDate >= monday;
    });

    const totalMs = weeklyEntries.reduce((acc, entry) => {
      if (!entry.checkInTime) return acc;
      const start = new Date(entry.checkInTime).getTime();
      const end = entry.checkOutTime ? new Date(entry.checkOutTime).getTime() : now.getTime();
      const diff = end - start;
      return acc + (diff > 0 ? diff : 0);
    }, 0);

    return Math.round((totalMs / 3600000) * 10) / 10;
  }, [allEntries, employeeId, now]);

  const progress = Math.min(100, (myWeeklyHours / myGoal) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-16">
      {/* --- PREMIUM HERO --- */}
      <div className="relative overflow-hidden bg-[#1e293b] rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Sparkles className="h-64 w-64" />
        </div>
        <div className="relative z-10 space-y-4">
          <Badge className="bg-[#227FD8] border-none font-black text-[9px] uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-2">
            WorkSync Experience
          </Badge>
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic">
              Bentornato, {employeeDoc?.firstName || (user?.displayName || "Collaboratore").split(' ')[0]} 🚀
            </h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
              <Calendar className="h-4 w-4" /> 
              {mounted ? now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : "Caricamento data..."}
            </p>
          </div>
          <div className="flex gap-4 pt-4">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex-1 md:flex-none md:w-48">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Status Oggi</p>
              <p className="text-xl font-black text-[#227FD8]">In Orario</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex-1 md:flex-none md:w-48">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Ore Settimana</p>
              <p className="text-xl font-black">{myWeeklyHours}h</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* --- MAIN COLUMN --- */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* TODAY SHIFT */}
            <Card className="border-none shadow-xl bg-white rounded-[2rem] ring-1 ring-slate-100 overflow-hidden transform hover:scale-[1.01] transition-all">
              <CardHeader className="bg-blue-50/50 p-6 pb-4 border-b border-blue-100/30">
                <div className="flex items-center justify-between">
                  <Badge className="bg-[#227FD8]/10 text-[#227FD8] border-none font-black text-[9px] uppercase tracking-widest">
                    Programma Odierno
                  </Badge>
                  <Clock className="h-4 w-4 text-[#227FD8]" />
                </div>
                <CardTitle className="text-2xl font-black text-[#1e293b] mt-3">
                  {isShiftsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : todayShift ? todayShift.title : "Nessun Turno"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {todayShift ? (
                  <div className="space-y-4">
                      <div className="flex items-center gap-3 text-lg font-black text-[#1e293b]">
                        <div className="h-10 w-10 bg-[#1e293b] text-white rounded-xl flex items-center justify-center shadow-lg">
                          <Zap className="h-5 w-5 fill-current" />
                        </div>
                        {mounted ? (
                          <>
                            {new Date(todayShift.startTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} 
                            <ArrowRight className="h-4 w-4 text-slate-300" />
                            {new Date(todayShift.endTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </>
                        ) : "..."}
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest opacity-60">Punto Vendita Centralizzato</p>
                  </div>
                ) : (
                  <div className="py-2 text-center">
                    <p className="text-sm text-slate-400 font-bold italic">Oggi sei libero, goditi il riposo!</p>
                  </div>
                )}
                <Link href="/employee/shifts" className="block mt-6">
                  <Button variant="outline" className="w-full h-11 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border-slate-200 hover:bg-[#1e293b] hover:text-white transition-all">
                    Tutti i turni <ArrowRight className="h-3.5 w-3.5 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* PERFORMANCE / PROGRESS */}
            <Card className="border-none shadow-xl bg-white rounded-[2rem] ring-1 ring-slate-100 overflow-hidden">
               <CardHeader className="bg-amber-50/50 p-6 pb-4 border-b border-amber-100/30">
                <div className="flex items-center justify-between">
                  <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[9px] uppercase tracking-widest">
                    Obbiettivo Settimana
                  </Badge>
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                </div>
                <CardTitle className="text-2xl font-black text-[#1e293b] mt-3">{myWeeklyHours}h / {myGoal}h</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Avanzamento</span>
                    <span className="text-xl font-black text-[#1e293b] italic">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-3 bg-slate-100 rounded-full overflow-hidden" />
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 flex items-center gap-3">
                   <div className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                     <Target className="h-4 w-4" />
                   </div>
                   <p className="text-[10px] font-bold text-amber-900 leading-tight">Mancano <b>{Math.max(0, myGoal - myWeeklyHours)}h</b> per completare il tuo target settimanale.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RECENT ACTIVITY */}
          <Card className="border-none shadow-xl bg-white rounded-[2rem] ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-black text-sm uppercase tracking-[0.3em] text-slate-500">Ultime Attività</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-[#227FD8] mt-1">Timeline presenze</CardDescription>
              </div>
              <LayoutGrid className="h-4 w-4 text-slate-300" />
            </CardHeader>
            <CardContent className="p-0">
              {isEntriesLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-[#227FD8] opacity-20" /></div>
              ) : recentEntries && recentEntries.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {recentEntries.map((act) => (
                    <div key={act.id} className="flex items-center gap-4 p-5 hover:bg-slate-50/50 transition-colors group">
                      <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-90",
                        !act.checkOutTime ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                      )}>
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                           <p className="text-sm font-black text-[#1e293b]">{!act.checkOutTime ? 'In Servizio' : 'Turno Concluso'}</p>
                           {!act.checkOutTime && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {mounted ? (
                            <>{new Date(act.checkInTime).toLocaleDateString('it-IT')} • {new Date(act.checkInTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</>
                          ) : "..."}
                        </p>
                      </div>
                      <Badge variant="outline" className="h-6 text-[9px] font-black uppercase tracking-widest border-slate-200 px-3">
                        {act.type === 'AUTO' ? 'Auto' : 'Manuale'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-24 text-center">
                  <div className="h-16 w-16 bg-slate-50 rounded-2xl mx-auto flex items-center justify-center mb-4">
                    <History className="h-8 w-8 text-slate-100" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Nessuna attività registrata</p>
                </div>
              )}
              <div className="p-4 bg-slate-50/50 border-t border-slate-50">
                <Link href="/employee/attendance">
                  <Button variant="ghost" className="w-full h-10 font-black text-[9px] uppercase tracking-[0.2em] text-[#227FD8]">
                    Vedi tutto lo storico <ArrowRight className="h-3.5 w-3.5 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- SIDEBAR COLUMN --- */}
        <div className="lg:col-span-4 space-y-6">
          <ClockInOut />
          
          <Card className="border-none shadow-xl bg-white rounded-[2rem] ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-[#227FD8]">Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-3">
              <Link href="/employee/modification-requests" className="block">
                <Button variant="outline" className="w-full justify-between h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black text-[10px] uppercase tracking-widest px-5 hover:bg-[#1e293b] hover:text-white group transition-all">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-4 w-4 text-[#227FD8] group-hover:text-white" /> Entra / Esce
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </Button>
              </Link>
              <Link href="/employee/requests" className="block">
                <Button variant="outline" className="w-full justify-between h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black text-[10px] uppercase tracking-widest px-5 hover:bg-[#1e293b] hover:text-white group transition-all">
                  <div className="flex items-center gap-3">
                    <Gift className="h-4 w-4 text-[#227FD8] group-hover:text-white" /> Ferie / Permessi
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl bg-[#227FD8] text-white rounded-[2rem] overflow-hidden relative group cursor-pointer">
            <div className="absolute top-0 right-0 p-8 opacity-10 transition-transform group-hover:rotate-12 duration-500">
               <FileText className="h-24 w-24" />
            </div>
            <CardContent className="p-8 relative z-10 space-y-4">
              <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20">
                <Info className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black italic text-xl tracking-tight">Supporto</h4>
                <p className="text-blue-100 text-xs font-medium leading-relaxed">
                  Controlla la bacheca per scaricare i manuali o leggere le procedure.
                </p>
              </div>
              <Link href="/employee/utilities" className="block pt-2">
                <Button variant="secondary" className="w-full h-12 rounded-xl bg-white text-[#227FD8] font-black text-[10px] uppercase tracking-widest hover:bg-blue-50">
                  Apri Utility
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
