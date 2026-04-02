
"use client"

import { Users, Calendar, Clock, FileText, Loader2, Info, Gift, ClipboardList, AlertTriangle, BellRing, ArrowRight, Zap, Coffee, Inbox, Calculator } from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ClockInOut } from "@/components/attendance/ClockInOut"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, collectionGroup, query, limit, orderBy } from "firebase/firestore"
import Link from "next/link"
import { useMemo, useState, useEffect } from "react"
import { format, isAfter, addMinutes, startOfWeek } from "date-fns"
import { cn } from "@/lib/utils"

export default function AdminDashboard() {
  const db = useFirestore()
  const { user } = useUser()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
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

  const modificationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collectionGroup(db, "modifications"), limit(200));
  }, [db])
  const { data: allMods } = useCollection(modificationsQuery)

  const employeeMap = useMemo(() => {
    if (!employees) return {};
    const map: Record<string, any> = {};
    for (const emp of employees) {
      map[emp.id] = emp;
    }
    return map;
  }, [employees]);

  const pendingRequests = useMemo(() => {
    const pRequests = (allRequests || [])
      .filter(r => {
        const s = (r.status || "").toUpperCase();
        return s === "PENDING" || s === "IN ATTESA";
      })
      .map(r => ({ ...r, category: "LEAVE" as const }));
    
    const pMods = (allMods || [])
      .filter(m => {
        const s = (m.status || "").toUpperCase();
        return s === "PENDING" || s === "IN ATTESA";
      })
      .map(m => ({ ...m, category: "MODIFICATION" as const }));
    
    return [...pRequests, ...pMods].sort((a, b) => {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [allRequests, allMods]);

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
    if (!allShifts || !allEntries || !employees || !now) return [];
    const todayStr = now.toISOString().split('T')[0];

    return allShifts.filter(shift => {
      if (shift.date !== todayStr) return false;
      if (shift.type === 'REST' || shift.type === 'ABSENCE' || shift.type === 'SICK') return false;
      
      const emp = employeeMap[shift.employeeId];
      if (!emp) return false;

      const isFrancesco = emp.firstName?.toLowerCase() === 'francesco' && emp.lastName?.toLowerCase() === 'evaristo';
      if (isFrancesco) return false;

      const empEntries = entriesByEmployee.get(shift.employeeId) || [];
      const hasEntry = empEntries.some(entry => {
        const entryDate = new Date(entry.checkInTime).toISOString().split('T')[0];
        if (entryDate !== todayStr) return false;
        
        const entryIn = new Date(entry.checkInTime);
        const shiftIn = new Date(shift.startTime);
        return Math.abs(entryIn.getTime() - shiftIn.getTime()) <= 4 * 60 * 60 * 1000;
      });

      if (hasEntry) return false;

      const startTime = new Date(shift.startTime);
      const limitTime = addMinutes(startTime, 20);
      return isAfter(now, limitTime);
    }).map(s => ({
      ...s,
      employee: employeeMap[s.employeeId]
    }));
  }, [allShifts, entriesByEmployee, employees, employeeMap, now]);

  const todayAttendance = useMemo(() => {
    if (!allShifts || !allEntries || !employees || !now) return [];
    const todayStr = now.toISOString().split('T')[0];
    
    const employeeIdsScheduledToday = Array.from(new Set(
      allShifts
        .filter(s => s.date === todayStr && s.type !== 'REST' && s.type !== 'ABSENCE' && s.type !== 'SICK')
        .map(s => s.employeeId)
    ));

    const employeeIdsWithEntriesToday = Array.from(new Set(
      allEntries
        .filter(e => new Date(e.checkInTime).toISOString().split('T')[0] === todayStr)
        .map(e => e.employeeId)
    ));

    const allRelevantIds = Array.from(new Set([...employeeIdsScheduledToday, ...employeeIdsWithEntriesToday]));

    return allRelevantIds.map(id => {
      const emp = employeeMap[id];
      if (!emp) return null;

      const empShifts = allShifts.filter(s => s.employeeId === id && s.date === todayStr && s.type !== 'REST' && s.type !== 'ABSENCE' && s.type !== 'SICK');
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
            if (inDiff > 20) isWrong = true;
          } else {
            isWrong = true;
          }
          return { ...entry, isWrong };
        });

      if (empEntries.length === 0 && empShifts.length === 0) return null;

      return {
        employee: emp,
        entries: empEntries,
        isCurrentlyIn: empEntries.some(e => !e.checkOutTime)
      };
    }).filter(item => item !== null);
  }, [allShifts, allEntries, employees, employeeMap, now, entriesByEmployee]);

  const myGoal = useMemo(() => {
    const me = employees?.find(e => e.id === employeeId);
    return me?.weeklyHours || 40;
  }, [employees, employeeId]);

  const myWeeklyHours = useMemo(() => {
    if (!allEntries || !employeeId || !now) return 0;
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
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* --- HERO SECTION: COMPACT --- */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[#1e293b] p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-48 w-48 rounded-full bg-[#227FD8]/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <Badge className="bg-[#227FD8] hover:bg-[#227FD8] text-white border-none px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20">
              Admin Control Center
            </Badge>
            <div className="space-y-0.5">
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter leading-none">
                Bentornato, <span className="text-[#227FD8]">{(user?.displayName || "Admin").split(' ')[0]}</span>.
              </h1>
              <p className="text-slate-400 font-medium text-base max-w-md">
                Ecco il riepilogo operativo del tuo team.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl min-w-[140px]">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#227FD8] mb-0.5">Status Team</p>
              <div className="flex items-end gap-1.5">
                <span className="text-3xl font-black tracking-tighter">
                  {allEntries?.filter(e => !e.checkOutTime).length || 0}
                </span>
                <span className="text-slate-500 font-bold mb-1 text-sm">/ {employees?.length || 0}</span>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase">ATTIVI ORA</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- STATS GRID: TIGHT --- */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard 
          title="Team Totale" 
          value={employees?.length || 0} 
          description="Collaboratori" 
          icon={Users} 
        />
        <StatCard 
          title="In Servizio" 
          value={allEntries?.filter(e => !e.checkOutTime).length || 0} 
          description="Attualmente attivi" 
          icon={Clock} 
        />
        <StatCard 
          title="Richieste" 
          value={pendingRequests.length} 
          description="Da revisionare" 
          icon={FileText} 
          trend={pendingRequests.length > 5 ? { value: pendingRequests.length, positive: false } : undefined}
        />
        <StatCard 
          title="Turni Oggi" 
          value={allShifts?.filter(s => s.date === now?.toISOString().split('T')[0] && s.type !== 'REST' && s.type !== 'ABSENCE' && s.type !== 'SICK').length || 0} 
          description="Pianificati oggi" 
          icon={Calendar} 
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* --- LEFT COLUMN: OPERATIONS --- */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* WHO'S IN SECTION: COMPACT */}
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[1.5rem] overflow-hidden">
            <CardHeader className="p-6 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-[#1e293b] tracking-tight">Presenze in Tempo Reale</CardTitle>
                <CardDescription className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Monitoraggio attivo.</CardDescription>
              </div>
              <div className="h-9 w-9 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                <Zap className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-1">
              <div className="grid gap-3 md:grid-cols-2">
                {isEntriesLoading ? (
                  <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-[#227FD8]" /></div>
                ) : todayAttendance.length > 0 ? todayAttendance.map((item) => {
                  const emp = item.employee;
                  if (!emp) return null;
                  const hasFinished = item.entries.length > 0 && !item.isCurrentlyIn;
                  const isAbsent = item.entries.length === 0;

                  return (
                    <div key={emp.id} className="group relative flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">
                      <div className="relative">
                        <Avatar className="h-11 w-11 border-2 border-white shadow-sm transition-transform group-hover:scale-105">
                          <AvatarImage src={emp.photoUrl} />
                          <AvatarFallback className={cn("font-black text-white", isAbsent ? "bg-rose-500" : "bg-[#227FD8]")}>
                            {(emp.firstName || "U").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {item.isCurrentlyIn && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-white animate-pulse shadow-sm" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-[#1e293b] truncate leading-tight">{emp.firstName} {emp.lastName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.isCurrentlyIn ? (
                            <Badge variant="outline" className="h-5 text-[8px] font-black uppercase bg-green-50 text-green-600 border-green-200">
                              OPERATIVO
                            </Badge>
                          ) : hasFinished ? (
                            <Badge variant="outline" className="h-5 text-[8px] font-black uppercase bg-slate-100 text-slate-400 border-slate-200">
                              TURNATO
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-5 text-[8px] font-black uppercase bg-rose-50 text-rose-500 border-rose-200">
                              ASSENTE
                            </Badge>
                          )}
                          
                          {item.entries.length > 0 && (
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter shrink-0">
                              {format(new Date(item.entries[item.entries.length - 1].checkInTime), "HH:mm")}
                              {item.entries[item.entries.length - 1].checkOutTime ? ` - ${format(new Date(item.entries[item.entries.length - 1].checkOutTime), "HH:mm")}` : " (Entrato)"}
                            </p>
                          )}
                        </div>
                      </div>
                      <Link href="/admin/attendance">
                        <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 text-slate-300 hover:text-[#227FD8] hover:bg-white transition-colors">
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  )
                }) : (
                  <div className="col-span-full py-12 text-center space-y-3 opacity-40">
                    <Coffee className="h-10 w-10 mx-auto text-slate-300" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nessun collaboratore attivo</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* PENDING REQUESTS SECTION: COMPACT */}
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[1.5rem] overflow-hidden">
            <CardHeader className="p-6 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-[#1e293b] tracking-tight">Richieste in Attesa</CardTitle>
                <CardDescription className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Da gestire.</CardDescription>
              </div>
              <div className="bg-amber-50 h-9 w-9 rounded-xl flex items-center justify-center text-amber-600">
                <BellRing className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-1">
              <div className="space-y-3">
                {pendingRequests.length > 0 ? (
                  <>
                    <div className="grid gap-3">
                      {pendingRequests.slice(0, 4).map((req, idx) => {
                        const emp = employeeMap[req.employeeId];
                        const isMod = req.category === "MODIFICATION";
                        return (
                          <div key={idx} className="group flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-xl shadow-sm text-white",
                                isMod ? "bg-amber-500 shadow-amber-200" : "bg-[#227FD8] shadow-blue-200"
                              )}>
                                {isMod ? <ClipboardList className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
                              </div>
                              <div>
                                <p className="text-xs font-black text-[#1e293b]">{emp ? `${emp.firstName} ${emp.lastName}` : "Utente Sconosciuto"}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge className={cn(
                                    "text-[7px] font-black uppercase px-1.5 py-0 h-3.5 border-none",
                                    isMod ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                  )}>
                                    {isMod ? "Modifica" : "Ferie"}
                                  </Badge>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">
                                    {isMod ? "Articoli" : req.type} • {req.submittedAt ? format(new Date(req.submittedAt), "dd MMM") : "--"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Link href={isMod ? "/admin/modifications" : "/admin/requests"}>
                              <Button className="rounded-xl h-10 px-4 bg-white border-slate-200 hover:bg-slate-50 text-[#1e293b] font-black text-[9px] uppercase tracking-widest shadow-sm border group-hover:bg-[#1e293b] group-hover:text-white group-hover:border-[#1e293b] transition-all">
                                Gestisci 
                                <ArrowRight className="ml-1.5 h-2.5 w-2.5" />
                              </Button>
                            </Link>
                          </div>
                        )
                      })}
                    </div>
                    {pendingRequests.length > 4 && (
                      <Link href="/admin/requests" className="block mt-3">
                        <Button variant="ghost" className="w-full h-11 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] text-[#227FD8] bg-blue-50/50 hover:bg-blue-50 border border-dashed border-blue-100">
                          Vedi tutte le {pendingRequests.length} richieste
                        </Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <div className="py-12 text-center space-y-3 opacity-40">
                    <div className="h-12 w-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Inbox className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nessuna richiesta</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- RIGHT COLUMN: MANAGEMENT & TOOLS: COMPACT --- */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="transform transition-transform hover:scale-[1.01]">
            <ClockInOut />
          </div>

          {/* ANOMALIES SECTION: COMPACT */}
          {missingClockIns.length > 0 && (
            <Card className="border-none shadow-xl shadow-rose-200/50 bg-rose-500 rounded-[1.5rem] text-white overflow-hidden p-0.5">
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-none font-black text-[8px] uppercase tracking-widest px-2">
                    Critico
                  </Badge>
                  <AlertTriangle className="h-4 w-4 text-rose-200 animate-bounce" />
                </div>
                <CardTitle className="text-xl font-black tracking-tight mt-3 italic">Timbrature Mancanti</CardTitle>
                <CardDescription className="text-rose-100 font-bold uppercase text-[8px] tracking-widest mt-0.5">
                   In turno ma non ancora presenti.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 p-5 pt-3">
                {missingClockIns.map((m, idx) => (
                  <div key={idx} className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-3 border border-white/10">
                    <Avatar className="h-9 w-9 border-2 border-white/20">
                      <AvatarImage src={m.employee?.photoUrl} />
                      <AvatarFallback className="font-black bg-rose-400 text-xs">{(m.employee?.firstName || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-xs truncate">{m.employee?.firstName} {m.employee?.lastName}</p>
                      <p className="text-[9px] font-bold text-rose-100 uppercase">Da: {m.startTime ? format(new Date(m.startTime), "HH:mm") : "--"}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* QUICK ACTIONS CARD: COMPACT */}
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[1.5rem] overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-sm font-black text-[#1e293b] uppercase tracking-widest">Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-2.5">
              <Link href="/admin/modifications" className="block group">
                <Button className="w-full justify-between rounded-xl h-12 bg-slate-50 hover:bg-[#1e293b] text-[#1e293b] hover:text-white border border-slate-100 transition-all font-black text-[10px] uppercase tracking-widest px-5 shadow-sm">
                  <span className="flex items-center gap-2.5">
                    <ClipboardList className="h-4 w-4 text-amber-500 group-hover:text-white" /> Modifiche Articoli
                  </span>
                  <ArrowRight className="h-3 w-3 opacity-50" />
                </Button>
              </Link>
              <Link href="/admin/requests" className="block group">
                <Button className="w-full justify-between rounded-xl h-12 bg-slate-50 hover:bg-[#227FD8] text-[#1e293b] hover:text-white border border-slate-100 transition-all font-black text-[10px] uppercase tracking-widest px-5 shadow-sm">
                  <span className="flex items-center gap-2.5">
                    <Gift className="h-4 w-4 text-[#227FD8] group-hover:text-white" /> Ferie e Permessi
                  </span>
                  <ArrowRight className="h-3 w-3 opacity-50" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* WEEKLY PROGRESS: COMPACT */}
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-[#1e293b] rounded-[1.5rem] text-white">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#227FD8]">Obiettivo Settimanale</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-5xl font-black tracking-tighter leading-none">{myWeeklyHours}h</span>
                <div className="text-right">
                  <span className="text-slate-500 font-bold block text-[9px] uppercase">Contratto</span>
                  <span className="text-xl font-black text-slate-300">/ {myGoal}h</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Progress value={progress} className="h-2.5 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-[#227FD8] rounded-full transition-all duration-1000" 
                    style={{ width: `${progress}%` }} 
                  />
                </Progress>
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                  <span>Progress</span>
                  <span>{progress >= 100 ? "OK" : `${Math.round(progress)}%`}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
