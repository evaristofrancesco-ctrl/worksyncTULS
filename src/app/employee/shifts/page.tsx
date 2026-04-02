"use client"

import { Calendar, Clock, MapPin, ChevronRight, Info, Loader2, Zap, LayoutGrid, Clock3, History, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { useState, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"

export default function MyShiftsPage() {
  const db = useFirestore()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [now] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setEmployeeId(localStorage.getItem("employeeId"))
  }, [])

  const shiftsQuery = useMemoFirebase(() => {
    if (!db || !employeeId) return null;
    return query(
      collection(db, "employees", employeeId, "shifts"),
      orderBy("startTime", "asc")
    );
  }, [db, employeeId])

  const { data: shifts, isLoading } = useCollection(shiftsQuery)

  const sortedShifts = useMemo(() => {
    if (!shifts) return [];
    const today = now.toISOString().split('T')[0];
    return shifts.filter(s => s.date >= today);
  }, [shifts, now]);

  const todayShift = useMemo(() => {
      const todayStr = now.toISOString().split('T')[0];
      return sortedShifts.find(s => s.date === todayStr);
  }, [sortedShifts, now]);

  const upcomingShifts = useMemo(() => {
      const todayStr = now.toISOString().split('T')[0];
      return sortedShifts.filter(s => s.date > todayStr);
  }, [sortedShifts, now]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-16">
      {/* --- HERO HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm ring-1 ring-slate-200">
        <div className="space-y-1">
          <Badge className="bg-[#227FD8]/10 text-[#227FD8] hover:bg-[#227FD8]/20 border-none px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
            Planning & Sedi
          </Badge>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tighter italic">Calendario Lavoro</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <Calendar className="h-4 w-4" /> 
            Controlla i tuoi turni e le sedi assegnate
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-1 account-dot bg-green-500 rounded-full animate-pulse" />
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Stato Settimana</p>
            <p className="text-xs font-bold text-[#1e293b]">Turni Regolari</p>
          </div>
        </div>
      </div>

      <Alert className="bg-blue-50/50 border-blue-100 rounded-[1.5rem] p-5">
        <Info className="h-4 w-4 text-[#227FD8]" />
        <AlertDescription className="text-blue-900 font-bold selection:bg-blue-200">
           Ricorda: Eventuali cambi turno devono essere concordati con l'amministrazione almeno 24 ore prima.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="py-32 text-center rounded-[3rem] bg-slate-50 border-2 border-dashed border-slate-100">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-[#227FD8] opacity-20" />
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Generazione planning...</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-12 items-start">
           
           {/* --- TODAY FOCUS --- */}
           <div className="lg:col-span-12 xl:col-span-5 space-y-6">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#1e293b] flex items-center gap-3 ml-2">
                 <Zap className="h-4 w-4 text-amber-500 fill-amber-500" /> Focus Odierno
              </h2>
              {todayShift ? (
                <Card className="border-none shadow-2xl bg-[#1e293b] text-white rounded-[2.5rem] overflow-hidden relative group">
                   <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                      <Clock3 className="h-48 w-48" />
                   </div>
                   <CardHeader className="p-8 pb-4 relative z-10">
                      <Badge className="bg-[#227FD8] border-none font-black text-[9px] uppercase tracking-widest px-4 py-1.5 mb-4">OGGI IN SERVIZIO</Badge>
                      <CardTitle className="text-4xl font-black italic tracking-tighter">{todayShift.title}</CardTitle>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                         <MapPin className="h-3 w-3 text-[#227FD8]" /> Sede Centrale TU.L.S.
                      </p>
                   </CardHeader>
                   <CardContent className="p-8 pt-4 relative z-10 space-y-8">
                       <div className="flex items-center gap-6">
                           <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Inizio</p>
                              <p className="text-2xl font-black text-[#227FD8]">{new Date(todayShift.startTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
                           </div>
                           <ArrowRight className="h-5 w-5 text-slate-600" />
                           <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fine</p>
                              <p className="text-2xl font-black text-rose-500">{new Date(todayShift.endTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
                           </div>
                       </div>
                       
                       <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 flex items-center gap-4">
                          <div className="h-10 w-10 bg-[#227FD8] rounded-xl flex items-center justify-center shadow-lg">
                             <Zap className="h-5 w-5 fill-current" />
                          </div>
                          <p className="text-xs font-medium text-slate-300 leading-relaxed">
                            Ricorda di timbrare l'ingresso tramite la sezione <b>Timbratura</b> per iniziare la sessione.
                          </p>
                       </div>
                   </CardContent>
                </Card>
              ) : (
                <Card className="border-none shadow-xl bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] py-20 text-center">
                   <div className="h-20 w-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-lg border border-slate-100 mb-6">
                      <Clock className="h-10 w-10 text-slate-100" />
                   </div>
                   <h3 className="text-xl font-black text-[#1e293b] tracking-tight italic">Nessun turno oggi</h3>
                   <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Goditi la giornata di riposo!</p>
                </Card>
              )}
           </div>

           {/* --- UPCOMING LIST --- */}
           <div className="lg:col-span-12 xl:col-span-7 space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                   <History className="h-4 w-4 text-[#227FD8]" /> Programma Futuro
                 </h2>
                 <Badge variant="outline" className="rounded-full border-slate-200 text-slate-400 text-[10px] font-bold px-3 py-1 uppercase">PROSSIME SETTIMANE</Badge>
              </div>

              <div className="grid gap-4">
                 {upcomingShifts.length > 0 ? upcomingShifts.map((shift) => {
                    const start = new Date(shift.startTime);
                    const end = new Date(shift.endTime);
                    
                    return (
                      <div key={shift.id} className="group relative bg-white rounded-[2rem] p-5 shadow-sm ring-1 ring-slate-200 hover:shadow-xl hover:ring-[#227FD8]/20 transition-all duration-300">
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                               <div className="h-14 w-14 rounded-2xl flex flex-col items-center justify-center bg-slate-100 text-slate-400 shadow-sm transition-transform group-hover:scale-105 group-hover:bg-[#227FD8]/5 group-hover:text-[#227FD8]">
                                  <span className="text-lg font-black leading-none">{start.toLocaleDateString('it-IT', { day: '2-digit' })}</span>
                                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{start.toLocaleDateString('it-IT', { month: 'short' })}</span>
                               </div>
                               <div>
                                  <h3 className="text-lg font-black text-[#1e293b] tracking-tighter italic uppercase">{shift.title}</h3>
                                  <div className="flex items-center gap-3 mt-1">
                                     <p className="text-[10px] font-black text-[#227FD8] uppercase tracking-widest flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> 
                                        {start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                     </p>
                                     <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-slate-100 bg-slate-50 text-slate-400 px-2">
                                        <MapPin className="h-2 w-2 mr-1" /> Sede Centrale
                                     </Badge>
                                  </div>
                               </div>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="text-right hidden sm:block">
                                  <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest mb-0.5">{start.toLocaleDateString('it-IT', { weekday: 'long' })}</p>
                                  <Badge className="bg-slate-50 text-slate-400 border-none font-black text-[9px] uppercase tracking-widest px-3">Programmato</Badge>
                               </div>
                               <ChevronRight className="h-5 w-5 text-slate-200 group-hover:text-[#227FD8] transition-colors" />
                            </div>
                         </div>
                      </div>
                    )
                 }) : (
                   <div className="py-32 text-center rounded-[3rem] bg-slate-50 border-2 border-dashed border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 italic">Nessun altro turno programmato</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
