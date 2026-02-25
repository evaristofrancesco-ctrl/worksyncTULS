
"use client"

import { Users, Calendar, Clock, FileText, Loader2, Info, Gift, ClipboardList, AlertTriangle, BellRing, ArrowRight } from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ClockInOut } from "@/components/attendance/ClockInOut"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, collectionGroup, query, limit } from "firebase/firestore"
import Link from "next/link"
import { useMemo, useState, useEffect } from "react"
import { format, isAfter, addMinutes, startOfWeek } from "date-fns"

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
    return query(collectionGroup(db, "requests"), limit(200));
  }, [db])
  const { data: allRequests } = useCollection(requestsQuery)

  const employeeMap = useMemo(() => {
    if (!employees) return {};
    const map: Record<string, any> = {};
    for (const emp of employees) {
      map[emp.id] = emp;
    }
    return map;
  }, [employees]);

  const entriesByEmployee = useMemo(() => {
    if (!allEntries) return new Map<string, any[]>();
    const map = new Map<string, any[]>();
    for (const entry of allEntries) {
      const list = map.get(entry.employeeId) || [];
      list.push(entry);
      map.set(entry.employeeId, list);
    }
    return map;
  }, [allEntries]);

  const missingClockIns = useMemo(() => {
    if (!allShifts || !allEntries || !employees) return [];
    
    const todayStr = now.toISOString().split('T')[0];

    return allShifts.filter(shift => {
      if (shift.date !== todayStr) return false;
      
      const emp = employeeMap[shift.employeeId];
      if (!emp) return false;

      const isFrancesco = emp.firstName?.toLowerCase() === 'francesco' && emp.lastName?.toLowerCase() === 'evaristo';
      if (isFrancesco) return false;

      const empEntries = entriesByEmployee.get(shift.employeeId) || [];
      const hasEntry = empEntries.some(entry => {
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
  }, [allShifts, entriesByEmployee, employees, employeeMap, now]);

  const todayAttendance = useMemo(() => {
    if (!allShifts || !allEntries || !employees) return [];
    
    const todayStr = now.toISOString().split('T')[0];
    
    const employeeIdsScheduledToday = Array.from(new Set(
      allShifts
        .filter(s => s.date === todayStr)
        .map(s => s.employeeId)
    ));

    return employeeIdsScheduledToday.map(id => {
      const emp = employeeMap[id];
      const empShifts = allShifts.filter(s => s.employeeId === id && s.date === todayStr);
      const empEntriesRaw = entriesByEmployee.get(id) || [];
      
      const empEntries = empEntriesRaw
        .filter(e => new Date(e.checkInTime).toISOString().split('T')[0] === todayStr)
        .sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime())
        .map(entry => {
          const entryIn = new Date(entry.checkInTime);
          
          const matchedShift = empShifts.find(s => {
            const shiftIn = new Date(s.startTime);
            return Math.abs(entryIn.getTime() - shiftIn.getTime()) < 4 * 60 * 60 * 1000;
          });

          let isWrong = false;
          if (matchedShift) {
            const shiftIn = new Date(matchedShift.startTime);
            const inDiff = Math.abs(entryIn.getTime() - shiftIn.getTime()) / 60000;
            if (inDiff > 15) isWrong = true;
          } else {
            isWrong = true;
          }

          return { ...entry, isWrong };
        });

      return {
        employee: emp,
        entries: empEntries,
        isCurrentlyIn: empEntries.some(e => !e.checkOutTime)
      };
    }).filter(item => item.employee);
  }, [allShifts, entriesByEmployee, employees, employeeMap, now]);

  const myGoal = useMemo(() => {
    const me = employees?.find(e => e.id === employeeId);
    return me?.weeklyHours || 40;
  }, [employees, employeeId]);

  const myWeeklyHours = useMemo(() => {
    if (!allEntries || !employeeId) return 0;
    
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    monday.setHours(0, 0, 0, 0);

    const personalEntries = (entriesByEmployee.get(employeeId) || []).filter(e => {
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
  }, [entriesByEmployee, employeeId, now]);

  const progress = Math.min(100, (myWeeklyHours / myGoal) * 100);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-black tracking-tight text-[#1e293b]">Pannello di Controllo</h1>
          <p className="text-lg text-muted-foreground font-semibold uppercase tracking-widest">Benvenuto, {(user?.displayName || "Amministratore").split(' ')[0]}.</p>
        </div>
        
        {missingClockIns.length > 0 && (
          <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-3xl flex items-center gap-4 animate-bounce">
            <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-lg shadow-rose-200">
              <BellRing className="h-6 w-6" />
            </div>
            <div>
              <p className="text-rose-700 font-black text-xs uppercase tracking-widest">Allerta Presenze</p>
              <p className="text-rose-900 font-bold text-sm">{missingClockIns.length} in ritardo.</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-10">
          <div className="grid gap-6 md:grid-cols-4">
            <StatCard title="Team" value={employees?.length || 0} description="Totali" icon={Users} />
            <StatCard title="Attivi" value={allEntries?.filter(e => !e.checkOutTime).length || 0} description="In servizio" icon={Clock} />
            <StatCard title="Richieste" value={allRequests?.filter(r => (r.status || "").toUpperCase() === "PENDING").length || 0} description="Da gestire" icon={FileText} />
            <StatCard title="Turni" value={allShifts?.filter(s => s.date === now.toISOString().split('T')[0]).length || 0} description="Oggi" icon={Calendar} />
          </div>

          <div className="grid gap-8 md:grid-cols-2">
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
                              <Badge 
                                key={e.id}
                                variant="outline" 
                                className={`h-6 text-[10px] font-bold ${
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
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white/80">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="font-black text-xl uppercase tracking-widest text-[#1e293b]">Obiettivo Settimanale</CardTitle>
                <CardDescription className="text-sm font-bold uppercase text-slate-400">Progresso ore basato sul contratto.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
                <div className="flex justify-between items-end">
                  <span className="text-5xl font-black text-[#1e293b] tracking-tighter">{myWeeklyHours}h</span>
                  <span className="text-xl font-black text-muted-foreground">su {myGoal}h</span>
                </div>
                <Progress value={progress} className="h-4 rounded-full bg-slate-100" />
                <div className="bg-[#227FD8]/5 p-4 rounded-2xl border border-[#227FD8]/10">
                  <p className="text-[10px] font-black uppercase text-[#227FD8] mb-1">Nota</p>
                  <p className="text-xs font-medium leading-relaxed">Il conteggio include il tempo della sessione di lavoro attualmente in corso.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <ClockInOut />
          
          <Card className="border-none shadow-md bg-[#227FD8] text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest opacity-80">Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/employee/modification-requests" className="block">
                <Button variant="secondary" className="w-full justify-start gap-3 font-black text-xs uppercase h-12 bg-white/10 border-none text-white hover:bg-white/20">
                  <ClipboardList className="h-5 w-5" /> Entra/Esce
                </Button>
              </Link>
              <Link href="/employee/requests" className="block">
                <Button variant="secondary" className="w-full justify-start gap-3 font-black text-xs uppercase h-12 bg-white/10 border-none text-white hover:bg-white/20">
                  <Gift className="h-5 w-5" /> Ferie/Permessi
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
