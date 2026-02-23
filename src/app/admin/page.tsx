
"use client"

import { Users, Calendar, Clock, FileText, Loader2, Info, Gift, ClipboardList, AlertTriangle, BellRing, ArrowRight } from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ClockInOut } from "@/components/attendance/ClockInOut"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, collectionGroup, doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import Link from "next/link"
import { useMemo, useState, useEffect } from "react"
import { format, isAfter, addMinutes, parseISO, startOfWeek } from "date-fns"

const weeklyStats = [
  { name: 'Lun', ore: 145 },
  { name: 'Mar', ore: 160 },
  { name: 'Mer', ore: 155 },
  { name: 'Gio', ore: 180 },
  { name: 'Ven', ore: 170 },
  { name: 'Sab', ore: 60 },
  { name: 'Dom', ore: 40 },
]

export default function AdminDashboard() {
  const db = useFirestore()
  const { user } = useUser()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    setEmployeeId(localStorage.getItem("employeeId"))
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

  const timeEntriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, "timeentries");
  }, [db])
  const { data: allEntries, isLoading: isEntriesLoading } = useCollection(timeEntriesQuery)

  const shiftsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, "shifts");
  }, [db])
  const { data: allShifts } = useCollection(shiftsQuery)

  const requestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, "requests");
  }, [db])
  const { data: allRequests } = useCollection(requestsQuery)

  const employeeMap = useMemo(() => {
    if (!employees) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      return acc;
    }, {} as any);
  }, [employees]);

  // Logica Anomalie
  const missingClockIns = useMemo(() => {
    if (!allShifts || !allEntries || !employees) return [];
    
    const todayStr = now.toISOString().split('T')[0];

    return allShifts.filter(shift => {
      if (shift.date !== todayStr) return false;
      
      const emp = employeeMap[shift.employeeId];
      if (!emp) return false;

      const isFrancesco = emp.firstName?.toLowerCase() === 'francesco' && emp.lastName?.toLowerCase() === 'evaristo';
      if (isFrancesco) return false;

      const hasEntry = allEntries.some(entry => {
        if (entry.employeeId !== shift.employeeId) return false;
        const entryDate = new Date(entry.checkInTime).toISOString().split('T')[0];
        if (entryDate !== todayStr) return false;
        
        const entryHour = new Date(entry.checkInTime).getHours();
        const shiftHour = new Date(shift.startTime).getHours();
        return Math.abs(entryHour - shiftHour) <= 3;
      });

      if (hasEntry) return false;

      const startTime = new Date(shift.startTime);
      const limitTime = addMinutes(startTime, 15);
      
      return isAfter(now, limitTime);
    }).map(s => ({
      ...s,
      employee: employeeMap[s.employeeId]
    }));
  }, [allShifts, allEntries, employees, employeeMap, now]);

  useEffect(() => {
    if (missingClockIns.length > 0 && db) {
      missingClockIns.forEach(anomaly => {
        const notifId = `alert-missing-${anomaly.employeeId}-${anomaly.date}-${new Date(anomaly.startTime).getHours()}`;
        const startTimeStr = new Date(anomaly.startTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        
        setDocumentNonBlocking(doc(db, "notifications", notifId), {
          id: notifId,
          recipientId: "ADMIN",
          title: "⚠️ Mancata Timbratura",
          message: `${anomaly.employee?.firstName} ${anomaly.employee?.lastName} doveva iniziare alle ${startTimeStr} ma non ha ancora timbrato.`,
          type: "ATTENDANCE_ALERT",
          createdAt: new Date().toISOString(),
          isRead: false
        }, { merge: true });
      });
    }
  }, [missingClockIns, db]);

  // Logica Presenze Recenti: Solo dipendenti in turno oggi con le loro timbrature raggruppate
  const todayAttendance = useMemo(() => {
    if (!allShifts || !allEntries || !employees) return [];
    
    const todayStr = now.toISOString().split('T')[0];
    
    // 1. Identifica chi ha un turno oggi
    const employeeIdsScheduledToday = Array.from(new Set(
      allShifts
        .filter(s => s.date === todayStr)
        .map(s => s.employeeId)
    ));

    // 2. Per ognuno recupera le timbrature di oggi e verifica la correttezza
    return employeeIdsScheduledToday.map(id => {
      const emp = employeeMap[id];
      const empShifts = allShifts.filter(s => s.employeeId === id && s.date === todayStr);
      
      const empEntries = allEntries
        .filter(e => e.employeeId === id && new Date(e.checkInTime).toISOString().split('T')[0] === todayStr)
        .sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime())
        .map(entry => {
          const entryIn = new Date(entry.checkInTime);
          
          // Trova il turno corrispondente (entro 4 ore dall'inizio)
          const matchedShift = empShifts.find(s => {
            const shiftIn = new Date(s.startTime);
            return Math.abs(entryIn.getTime() - shiftIn.getTime()) < 4 * 60 * 60 * 1000;
          });

          let isWrong = false;
          if (matchedShift) {
            const shiftIn = new Date(matchedShift.startTime);
            const shiftOut = new Date(matchedShift.endTime);
            
            // Verifica Ingresso (tolleranza 15m)
            const inDiff = Math.abs(entryIn.getTime() - shiftIn.getTime()) / 60000;
            if (inDiff > 15) isWrong = true;

            // Verifica Uscita (tolleranza 15m)
            if (entry.checkOutTime) {
              const entryOut = new Date(entry.checkOutTime);
              const outDiff = Math.abs(entryOut.getTime() - shiftOut.getTime()) / 60000;
              if (outDiff > 15) isWrong = true;
            }
          } else {
            // Timbratura senza turno previsto
            isWrong = true;
          }

          return { ...entry, isWrong };
        });

      return {
        employee: emp,
        entries: empEntries,
        isCurrentlyIn: empEntries.some(e => !e.checkOutTime)
      };
    }).filter(item => item.employee); // Rimuove eventuali null
  }, [allShifts, allEntries, employees, employeeMap, now]);

  const myGoal = useMemo(() => {
    const me = employees?.find(e => e.id === employeeId);
    return me?.weeklyHours || 40;
  }, [employees, employeeId]);

  const myWeeklyHours = useMemo(() => {
    if (!allEntries || !employeeId) return 0;
    
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    monday.setHours(0, 0, 0, 0);

    const personalEntries = allEntries.filter(e => {
      if (e.employeeId !== employeeId) return false;
      const entryDate = new Date(e.checkInTime);
      return entryDate >= monday;
    });

    const totalMs = personalEntries.reduce((acc, entry) => {
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
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-black tracking-tight text-[#1e293b]">Pannello di Controllo</h1>
          <p className="text-lg text-muted-foreground font-semibold uppercase tracking-widest">Benvenuto, {(user?.displayName || "Amministratore").split(' ')[0]}. Gestisci il tuo team oggi.</p>
        </div>
        
        {missingClockIns.length > 0 && (
          <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-3xl flex items-center gap-4 animate-bounce">
            <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-lg shadow-rose-200">
              <BellRing className="h-6 w-6" />
            </div>
            <div>
              <p className="text-rose-700 font-black text-xs uppercase tracking-widest">Allerta Presenze</p>
              <p className="text-rose-900 font-bold text-sm">{missingClockIns.length} collaboratori in ritardo.</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-10">
          <div className="grid gap-6 md:grid-cols-4">
            <Link href="/admin/employees" className="block transition-all hover:scale-[1.03] active:scale-[0.97]">
              <StatCard title="Team" value={employees?.length || 0} description="Totali" icon={Users} />
            </Link>
            <Link href="/admin/attendance" className="block transition-all hover:scale-[1.03] active:scale-[0.97]">
              <StatCard title="Attivi" value={allEntries?.filter(e => !e.checkOutTime).length || 0} description="In servizio" icon={Clock} />
            </Link>
            <Link href="/admin/requests" className="block transition-all hover:scale-[1.03] active:scale-[0.97]">
              <StatCard title="Richieste" value={allRequests?.filter(r => (r.status || "").toUpperCase() === "PENDING").length || 0} description="Da gestire" icon={FileText} />
            </Link>
            <Link href="/admin/shifts" className="block transition-all hover:scale-[1.03] active:scale-[0.97]">
              <StatCard title="Turni" value={allShifts?.filter(s => s.date === now.toISOString().split('T')[0]).length || 0} description="Oggi" icon={Calendar} />
            </Link>
          </div>

          {missingClockIns.length > 0 && (
            <Card className="border-none shadow-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10"><AlertTriangle className="h-32 w-32" /></div>
              <CardHeader className="p-6">
                <CardTitle className="font-black text-xl uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6" /> Dipendenti in Ritardo
                </CardTitle>
                <CardDescription className="text-rose-100 font-bold uppercase text-xs">Azione richiesta: verifica la presenza del personale.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="grid gap-4 md:grid-cols-2">
                  {missingClockIns.map(anomaly => (
                    <div key={anomaly.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-white/20">
                        <AvatarImage src={anomaly.employee?.photoUrl} />
                        <AvatarFallback className="font-black text-rose-700 bg-white">{anomaly.employee?.firstName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-black text-sm">{anomaly.employee?.firstName} {anomaly.employee?.lastName}</p>
                        <p className="text-[10px] font-bold uppercase opacity-80">Inizio previsto: {new Date(anomaly.startTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border-none shadow-md bg-white/80">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="font-black text-xl uppercase tracking-widest text-[#1e293b]">Carico Lavoro Team</CardTitle>
                <CardDescription className="text-sm font-bold uppercase text-slate-400">Stima ore settimanali pianificate.</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] p-6 pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '14px', fontWeight: '800' }} />
                    <YAxis axisLine={false} tickLine={false} style={{ fontSize: '14px', fontWeight: '800' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', fontSize: '15px', border: 'none', fontWeight: '800', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="ore" radius={[6, 6, 0, 0]} fill="#227FD8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white/80">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="font-black text-xl uppercase tracking-widest text-[#1e293b]">Presenze Recenti</CardTitle>
                <CardDescription className="text-sm font-bold uppercase text-slate-400">Collaboratori in turno oggi.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="space-y-6">
                  {isEntriesLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin h-10 w-10 text-[#227FD8]" /></div>
                  ) : todayAttendance.length > 0 ? todayAttendance.map((item) => {
                    const emp = item.employee;
                    return (
                      <div key={emp.id} className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border shadow-sm">
                          <AvatarImage src={emp?.photoUrl} />
                          <AvatarFallback className="font-black">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-[#1e293b] truncate">{emp.firstName} {emp.lastName}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {item.entries.length > 0 ? item.entries.map((e, idx) => (
                              <div key={e.id} className="flex items-center gap-1.5">
                                <Badge 
                                  variant="outline" 
                                  className={`h-6 text-[10px] font-bold transition-colors ${
                                    e.isWrong 
                                      ? "bg-rose-50 text-rose-700 border-rose-200" 
                                      : !e.checkOutTime 
                                        ? "bg-green-50 text-green-700 border-green-200" 
                                        : "bg-slate-50 text-slate-500 border-slate-200"
                                  }`}
                                >
                                  {new Date(e.checkInTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                  <ArrowRight className="h-2.5 w-2.5 mx-1" />
                                  {e.checkOutTime ? new Date(e.checkOutTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "..."}
                                </Badge>
                              </div>
                            )) : (
                              <span className="text-[10px] text-slate-400 font-bold uppercase italic">Non ancora entrato</span>
                            )}
                          </div>
                        </div>
                        {item.isCurrentlyIn && (
                          <Badge className="bg-green-500 text-[9px] font-black uppercase tracking-widest animate-pulse">In Servizio</Badge>
                        )}
                      </div>
                    )
                  }) : (
                    <p className="text-base text-center text-muted-foreground py-14 italic font-bold uppercase tracking-widest opacity-40">Nessun collaboratore in turno.</p>
                  )}
                </div>
                <Link href="/admin/attendance" className="block mt-8">
                  <Button variant="ghost" className="w-full text-sm font-black uppercase tracking-[0.2em] h-14 border-t rounded-none border-dashed border-slate-200 hover:bg-slate-50">Vedi Registro Completo</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <ClockInOut />

          <Card className="border-none shadow-md bg-white/80">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-[#227FD8]">Obiettivo {myGoal}h Settimanali</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-5xl font-black text-[#1e293b] tracking-tighter">{myWeeklyHours}h</span>
                <span className="text-xl font-black text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-4 rounded-full bg-slate-100" />
              <p className="text-xs text-muted-foreground italic font-bold uppercase tracking-tight text-center">Progresso basato sulle timbrature correnti.</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white/80">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-widest text-[#1e293b]">Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-5">
              <Link href="/employee/modification-requests" className="block">
                <Button variant="outline" className="w-full justify-start gap-4 font-black text-sm uppercase tracking-widest h-16 border-green-600/20 text-green-700 hover:bg-green-50 shadow-sm">
                  <ClipboardList className="h-6 w-6" /> Richiesta Entra/Esce
                </Button>
              </Link>
              <Link href="/employee/requests" className="block">
                <Button variant="outline" className="w-full justify-start gap-4 font-black text-sm uppercase tracking-widest h-16 border-[#227FD8]/20 text-[#227FD8] hover:bg-[#227FD8]/5 shadow-sm">
                  <Gift className="h-6 w-6" /> Richiesta Ferie / Permesso
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
