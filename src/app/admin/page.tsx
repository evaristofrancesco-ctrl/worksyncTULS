
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
    return [...allEntries]
      .filter(e => e.companyId === "default" && e.checkInTime)
      .sort((a, b) => {
        const dateA = new Date(a.checkInTime).getTime();
        const dateB = new Date(b.checkInTime).getTime();
        return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
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
    return allRequests.filter(r => r.status === "In Attesa" || r.status === "PENDING").length;
  }, [allRequests]);

  const myWeeklyHours = useMemo(() => {
    if (!allEntries || !employeeId) return 0;
    const personalEntries = allEntries.filter(e => e.employeeId === employeeId);
    return personalEntries.length * 4; 
  }, [allEntries, employeeId]);

  const progress = Math.min(100, (myWeeklyHours / 40) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-[#1e293b]">Pannello di Controllo</h1>
        <p className="text-xs text-muted-foreground font-medium">Benvenuto, {(user?.displayName || "Amministratore").split(' ')[0]}. Gestisci il tuo team oggi.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard title="Team" value={employees?.length || 0} description="Totali" icon={Users} />
            <StatCard title="Attivi" value={activeEmployeesCount} description="In servizio" icon={Clock} />
            <StatCard title="Richieste" value={pendingRequestsCount} description="Da gestire" icon={FileText} />
            <StatCard title="Turni" value={allShifts?.filter(s => s.date === new Date().toISOString().split('T')[0]).length || 0} description="Oggi" icon={Calendar} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-sm bg-white/80">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="font-black text-sm">Carico Lavoro Team</CardTitle>
                <CardDescription className="text-[10px]">Stima ore settimanali.</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px] p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                    <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', fontSize: '10px' }} />
                    <Bar dataKey="ore" radius={[2, 2, 0, 0]} fill="#227FD8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/80">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="font-black text-sm">Presenze Recenti</CardTitle>
                <CardDescription className="text-[10px]">Ultimi movimenti registrati.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="space-y-3">
                  {isEntriesLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin h-5 w-5 text-primary" /></div>
                  ) : recentEntries.length > 0 ? recentEntries.map((log) => {
                    const emp = employeeMap[log.employeeId];
                    return (
                      <div key={log.id} className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 border">
                          <AvatarImage src={emp?.photoUrl} />
                          <AvatarFallback className="text-[10px] font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-[#1e293b] truncate">{emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}</p>
                          <p className="text-[9px] text-muted-foreground uppercase">{emp?.jobTitle || "Collaboratore"}</p>
                        </div>
                        <Badge variant={!log.checkOutTime ? "default" : "secondary"} className={`h-4 text-[8px] font-bold ${!log.checkOutTime ? "bg-green-500" : ""}`}>
                          {new Date(log.checkInTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </Badge>
                      </div>
                    )
                  }) : (
                    <p className="text-[10px] text-center text-muted-foreground py-6 italic">Nessun movimento oggi.</p>
                  )}
                </div>
                <Link href="/admin/attendance" className="block mt-4">
                  <Button variant="ghost" className="w-full text-[9px] font-black uppercase tracking-widest h-8">Registro Completo</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <ClockInOut />

          <Card className="border-none shadow-sm bg-white/80">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-[#227FD8]">Obiettivo 40h</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-xl font-black text-[#1e293b]">{myWeeklyHours}h</span>
                <span className="text-[10px] font-bold text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white/80">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-black">Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <Link href="/employee/modification-requests" className="block">
                <Button variant="outline" className="w-full justify-start gap-2 font-bold text-xs h-9 border-green-600/20 text-green-700 hover:bg-green-50">
                  <ClipboardList className="h-3.5 w-3.5" /> Richiesta Modifica
                </Button>
              </Link>
              <Link href="/employee/requests" className="block">
                <Button variant="outline" className="w-full justify-start gap-2 font-bold text-xs h-9 border-[#227FD8]/20 text-[#227FD8] hover:bg-[#227FD8]/5">
                  <Gift className="h-3.5 w-3.5" /> Ferie / Permesso
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
