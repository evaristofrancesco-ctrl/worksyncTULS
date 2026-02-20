
"use client"

import { Users, Calendar, Clock, FileText, Loader2, Info, Gift, ClipboardList } from "lucide-react"
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
import { collection, collectionGroup } from "firebase/firestore"
import Link from "next/link"
import { useMemo, useState, useEffect } from "react"

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

  useEffect(() => {
    setEmployeeId(localStorage.getItem("employeeId"))
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

  const recentEntries = useMemo(() => {
    if (!allEntries) return [];
    const todayStr = new Date().toISOString().split('T')[0];
    return [...allEntries]
      .filter(e => {
        if (e.companyId !== "default" || !e.checkInTime) return false;
        try {
          const entryDate = new Date(e.checkInTime).toISOString().split('T')[0];
          return entryDate === todayStr;
        } catch (err) {
          return false;
        }
      })
      .sort((a, b) => {
        const dateA = new Date(a.checkInTime).getTime();
        const dateB = new Date(b.checkInTime).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [allEntries]);

  const activeEmployeesCount = useMemo(() => {
    if (!allEntries) return 0;
    const todayStr = new Date().toISOString().split('T')[0];
    return allEntries.filter(e => {
      const checkIn = e.checkInTime ? new Date(e.checkInTime) : null;
      if (!checkIn || isNaN(checkIn.getTime())) return false;
      return checkIn.toISOString().split('T')[0] === todayStr && !e.checkOutTime;
    }).length;
  }, [allEntries]);

  // Modificato: conta solo le richieste non ancora gestite (esitate)
  const pendingRequestsCount = useMemo(() => {
    if (!allRequests) return 0;
    return allRequests.filter(r => {
      const s = (r.status || "").toUpperCase();
      return s === "PENDING" || s === "IN ATTESA";
    }).length;
  }, [allRequests]);

  const myWeeklyHours = useMemo(() => {
    if (!allEntries || !employeeId) return 0;
    const personalEntries = allEntries.filter(e => e.employeeId === employeeId);
    return personalEntries.length * 4; 
  }, [allEntries, employeeId]);

  const progress = Math.min(100, (myWeeklyHours / 40) * 100);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight text-[#1e293b]">Pannello di Controllo</h1>
        <p className="text-base text-muted-foreground font-semibold uppercase tracking-wider">Benvenuto, {(user?.displayName || "Amministratore").split(' ')[0]}. Gestisci il tuo team oggi.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-10">
          <div className="grid gap-6 md:grid-cols-4">
            <StatCard title="Team" value={employees?.length || 0} description="Totali" icon={Users} />
            <StatCard title="Attivi" value={activeEmployeesCount} description="In servizio" icon={Clock} />
            <StatCard title="Richieste" value={pendingRequestsCount} description="Da gestire" icon={FileText} />
            <StatCard title="Turni" value={allShifts?.filter(s => s.date === new Date().toISOString().split('T')[0]).length || 0} description="Oggi" icon={Calendar} />
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border-none shadow-md bg-white/80">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="font-black text-lg uppercase tracking-widest text-[#1e293b]">Carico Lavoro Team</CardTitle>
                <CardDescription className="text-xs font-bold uppercase text-slate-400">Stima ore settimanali pianificate.</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] p-6 pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '13px', fontWeight: '800' }} />
                    <YAxis axisLine={false} tickLine={false} style={{ fontSize: '13px', fontWeight: '800' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', fontSize: '14px', border: 'none', fontWeight: '800', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="ore" radius={[6, 6, 0, 0]} fill="#227FD8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white/80">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="font-black text-lg uppercase tracking-widest text-[#1e293b]">Presenze Recenti</CardTitle>
                <CardDescription className="text-xs font-bold uppercase text-slate-400">Movimenti registrati oggi.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="space-y-5">
                  {isEntriesLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-[#227FD8]" /></div>
                  ) : recentEntries.length > 0 ? recentEntries.map((log) => {
                    const emp = employeeMap[log.employeeId];
                    return (
                      <div key={log.id} className="flex items-center gap-4">
                        <Avatar className="h-11 w-11 border-2 border-white shadow-md">
                          <AvatarImage src={emp?.photoUrl} />
                          <AvatarFallback className="text-sm font-black bg-slate-100">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-black text-[#1e293b] truncate leading-tight">{emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}</p>
                          <p className="text-[11px] text-muted-foreground uppercase font-black tracking-tighter">{emp?.jobTitle || "Collaboratore"}</p>
                        </div>
                        <Badge variant={!log.checkOutTime ? "default" : "secondary"} className={`h-7 px-3 text-[11px] font-black tracking-widest ${!log.checkOutTime ? "bg-green-500 hover:bg-green-600 shadow-sm" : ""}`}>
                          {new Date(log.checkInTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </Badge>
                      </div>
                    )
                  }) : (
                    <p className="text-sm text-center text-muted-foreground py-14 italic font-bold uppercase tracking-widest opacity-40">Nessun movimento oggi.</p>
                  )}
                </div>
                <Link href="/admin/attendance" className="block mt-8">
                  <Button variant="ghost" className="w-full text-xs font-black uppercase tracking-[0.2em] h-12 border-t rounded-none border-dashed border-slate-200 hover:bg-slate-50">Vedi Registro Completo</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <ClockInOut />

          <Card className="border-none shadow-md bg-white/80">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-[#227FD8]">Obiettivo 40h Settimanali</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-5">
              <div className="flex justify-between items-end">
                <span className="text-4xl font-black text-[#1e293b] tracking-tighter">{myWeeklyHours}h</span>
                <span className="text-base font-black text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3 rounded-full bg-slate-100" />
              <p className="text-[11px] text-muted-foreground italic font-bold uppercase tracking-tighter text-center">Progresso basato sulle timbrature correnti.</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white/80">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-black uppercase tracking-widest text-[#1e293b]">Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <Link href="/employee/modification-requests" className="block">
                <Button variant="outline" className="w-full justify-start gap-4 font-black text-xs uppercase tracking-widest h-14 border-green-600/20 text-green-700 hover:bg-green-50 shadow-sm">
                  <ClipboardList className="h-5 w-5" /> Richiesta Entra/Esce
                </Button>
              </Link>
              <Link href="/employee/requests" className="block">
                <Button variant="outline" className="w-full justify-start gap-4 font-black text-xs uppercase tracking-widest h-14 border-[#227FD8]/20 text-[#227FD8] hover:bg-[#227FD8]/5 shadow-sm">
                  <Gift className="h-5 w-5" /> Richiesta Ferie / Permesso
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
