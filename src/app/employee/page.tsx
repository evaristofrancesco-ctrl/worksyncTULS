
"use client"

import { Calendar, Clock, FileText, Gift, Info, Loader2, ClipboardList } from "lucide-react"
import { ClockInOut } from "@/components/attendance/ClockInOut"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { useMemo, useState, useEffect } from "react"
import Link from "next/link"

export default function EmployeeDashboard() {
  const { user } = useUser()
  const db = useFirestore()
  const [employeeId, setEmployeeId] = useState<string | null>(null)

  useEffect(() => {
    setEmployeeId(localStorage.getItem("employeeId"))
  }, [])

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
    return allEntries.slice(0, 3);
  }, [allEntries]);

  const todayShift = useMemo(() => {
    if (!shifts) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    return shifts.find(s => s.date === todayStr);
  }, [shifts]);

  const myWeeklyHours = useMemo(() => {
    if (!allEntries || !employeeId) return 0;
    
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const weeklyEntries = allEntries.filter(e => {
      const entryDate = new Date(e.checkInTime);
      return entryDate >= monday;
    });

    const totalMs = weeklyEntries.reduce((acc, entry) => {
      if (!entry.checkInTime || !entry.checkOutTime) return acc;
      const start = new Date(entry.checkInTime).getTime();
      const end = new Date(entry.checkOutTime).getTime();
      return acc + (end - start);
    }, 0);

    return Math.round((totalMs / 3600000) * 10) / 10;
  }, [allEntries, employeeId]);

  const progress = Math.min(100, (myWeeklyHours / 40) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-[#1e293b]">Dashboard Personale</h1>
        <p className="text-xs text-muted-foreground font-medium">Bentornato, {(user?.displayName || "Collaboratore").split(' ')[0]}.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-none shadow-sm bg-[#227FD8]/5">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[#227FD8] font-black uppercase text-[9px] tracking-widest">Turno Oggi</CardDescription>
                <CardTitle className="text-lg font-black text-[#1e293b]">
                  {isShiftsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : todayShift ? todayShift.title : "Nessun Turno"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {todayShift ? (
                  <div className="flex items-center gap-2 font-bold text-xs text-[#1e293b]">
                    <Clock className="h-3.5 w-3.5 text-[#227FD8]" />
                    {new Date(todayShift.startTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - 
                    {new Date(todayShift.endTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Libero per oggi.</p>
                )}
                <Link href="/employee/shifts">
                  <Button size="sm" className="w-full mt-4 bg-[#227FD8] font-black h-8 text-[10px] uppercase">Vedi Programma</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/80">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-amber-600 font-black uppercase text-[9px] tracking-widest">Progressi {myWeeklyHours}h / 40h</CardDescription>
                <CardTitle className="text-lg font-black text-[#1e293b]">{Math.round(progress)}%</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <Progress value={progress} className="h-1.5" />
                <p className="text-[9px] text-muted-foreground italic">Calcolato su orari reali della settimana.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm bg-white/80">
            <CardHeader className="p-4 border-b">
              <CardTitle className="font-black text-sm uppercase tracking-wider">Ultime Attività</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {isEntriesLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin h-5 w-5 text-primary" /></div>
              ) : recentEntries && recentEntries.length > 0 ? recentEntries.map((act) => (
                <div key={act.id} className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${!act.checkOutTime ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-500'}`}>
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-[#1e293b]">{!act.checkOutTime ? 'In Servizio' : 'Turno Chiuso'}</p>
                    <p className="text-[9px] text-muted-foreground">{new Date(act.checkInTime).toLocaleDateString('it-IT')} - {new Date(act.checkInTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <Badge variant="outline" className="h-4 text-[8px] font-black uppercase">{act.type}</Badge>
                </div>
              )) : (
                <p className="text-[10px] text-center text-muted-foreground py-6 italic">Nessuna attività.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <ClockInOut />
          
          <Card className="border-none shadow-sm bg-white/80">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-[#227FD8]">Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <Link href="/employee/modification-requests" className="block">
                <Button variant="outline" className="w-full justify-start gap-2 font-bold text-xs h-9 border-[#227FD8]/20 text-[#227FD8] hover:bg-[#227FD8]/5">
                  <ClipboardList className="h-3.5 w-3.5" /> Entra/Esce
                </Button>
              </Link>
              <Link href="/employee/requests" className="block">
                <Button variant="outline" className="w-full justify-start gap-2 font-bold text-xs h-9 border-[#227FD8]/20 text-[#227FD8] hover:bg-[#227FD8]/5">
                  <Gift className="h-3.5 w-3.5" /> Ferie / Permesso
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-[#227FD8] text-white">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-white/70" />
                <h4 className="font-black uppercase tracking-tighter text-xs">Comunicazioni</h4>
              </div>
              <p className="text-[11px] text-white/90 leading-relaxed font-medium">
                Controlla la bacheca utility per aggiornamenti importanti.
              </p>
              <Link href="/employee/utilities">
                <Button variant="secondary" size="sm" className="w-full h-8 font-black text-[#227FD8] text-[10px] uppercase">Apri Bacheca</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
