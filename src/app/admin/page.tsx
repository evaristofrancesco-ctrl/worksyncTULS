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

  const pendingRequestsCount = useMemo(() => {
    if (!allRequests) return 0;
    return allRequests.filter(r => r.status === "In Attesa" || r.status === "PENDING" || r.status === "Approvato" === false).length;
  }, [allRequests]);

  const myWeeklyHours = useMemo(() => {
    if (!allEntries || !employeeId) return 0;
    const personalEntries = allEntries.filter(e => e.employeeId === employeeId);
    return personalEntries.length * 4; 
  }, [allEntries, employeeId]);

  const progress = Math.min(100, (myWeeklyHours / 40) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Pannello di Controllo</h1>
        <p className="text-sm text-muted-foreground font-semibold">Benvenuto, {(user?.displayName || "Amministratore").split(' ')[0]}. Gestisci il tuo team oggi.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title="Team" value={employees?.length || 0} description="Totali" icon={Users} />
            <StatCard title="Attivi" value={activeEmployeesCount} description="In servizio" icon={Clock} />
            <StatCard title="Richieste" value={pendingRequestsCount} description="Da gestire" icon={FileText} />
            <StatCard title="Turni" value={allShifts?.filter(s => s.date === new Date().toISOString().split('T')[0]).length || 0} description="Oggi" icon={Calendar} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-sm bg-white/80">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="font-black text-base uppercase tracking-tight">Carico Lavoro Team</CardTitle>
                <CardDescription className="text-xs font-medium">Stima ore settimanali pianificate.</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '12px', fontWeight: '700' }} />
                    <YAxis axisLine={false} tickLine={false} style={{ fontSize: '12px', fontWeight: '700' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', fontSize: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="ore" radius={[4, 4, 0, 0]} fill="#227FD8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/80">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="font-black text-base uppercase tracking-tight">Presenze Recenti</CardTitle>
                <CardDescription className="text-xs font-medium">Movimenti registrati oggi.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-2">
                <div className="space-y-4">
                  {isEntriesLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
                  ) : recentEntries.length > 0 ? recentEntries.map((log) => {
                    const emp = employeeMap[log.employeeId];
                    return (
                      <div key={log.id} className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border shadow-sm">
                          <AvatarImage src={emp?.photoUrl} />
                          <AvatarFallback className="text-xs font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-[#1e293b] truncate">{emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}</p>
                          <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">{emp?.jobTitle || "Collaboratore"}</p>
                        </div>
                        <Badge variant={!log.checkOutTime ? "default" : "secondary"} className={`h-6 text-[10px] font-black tracking-widest ${!log.checkOutTime ? "bg-green-500 hover:bg-green-600" : ""}`}>
                          {new Date(log.checkInTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </Badge>
                      </div>
                    )
                  }) : (
                    <p className="text-sm text-center text-muted-foreground py-10 italic font-medium">Nessun movimento oggi.</p>
                  )}
                </div>
                <Link href="/admin/attendance" className="block mt-6">
                  <Button variant="ghost" className="w-full text-xs font-black uppercase tracking-widest h-10 border-t rounded-none border-dashed">Vedi Registro Completo</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <ClockInOut />

          <Card className="border-none shadow-sm bg-white/80">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-[#227FD8]">Obiettivo 40h Settimanali</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-3xl font-black text-[#1e293b] tracking-tighter">{myWeeklyHours}h</span>
                <span className="text-sm font-black text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2.5 rounded-full" />
              <p className="text-[11px] text-muted-foreground italic font-medium text-center">Progresso basato sulle timbrature correnti.</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white/80">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-black uppercase tracking-tight">Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              <Link href="/employee/modification-requests" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 font-black text-sm h-11 border-green-600/20 text-green-700 hover:bg-green-50 shadow-sm">
                  <ClipboardList className="h-4 w-4" /> Richiesta Modifica Articoli
                </Button>
              </Link>
              <Link href="/employee/requests" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 font-black text-sm h-11 border-[#227FD8]/20 text-[#227FD8] hover:bg-[#227FD8]/5 shadow-sm">
                  <Gift className="h-4 w-4" /> Richiesta Ferie / Permesso
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
