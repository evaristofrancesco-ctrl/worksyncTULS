
"use client"

import { Users, Calendar, Clock, FileText, ArrowUpRight, Loader2, Info, Gift } from "lucide-react"
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

  // Dati globali per Admin
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

  // Mappa dei dipendenti
  const employeeMap = useMemo(() => {
    if (!employees) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      return acc;
    }, {} as any);
  }, [employees]);

  // Voci recenti (Globali)
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

  // Statistiche personali Admin (come dipendente)
  const myShifts = useMemo(() => {
    if (!allShifts || !employeeId) return [];
    return allShifts.filter(s => s.employeeId === employeeId);
  }, [allShifts, employeeId]);

  const todayShift = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return myShifts.find(s => s.date === todayStr);
  }, [myShifts]);

  const activeEmployeesCount = useMemo(() => {
    if (!allEntries) return 0;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
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
    // Calcolo semplificato per ore settimanali personali
    const personalEntries = allEntries.filter(e => e.employeeId === employeeId);
    return personalEntries.length * 4; 
  }, [allEntries, employeeId]);

  const progress = Math.min(100, (myWeeklyHours / 40) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Pannello di Controllo TU.L.S.</h1>
          <p className="text-muted-foreground">Gestione aziendale e attività personali di {(user?.displayName || "Amministratore").split(' ')[0]}.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Colonna Sinistra: Monitoraggio Aziendale */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard 
              title="Team Totale" 
              value={employees?.length || 0} 
              description="Collaboratori registrati" 
              icon={Users}
            />
            <StatCard 
              title="In Servizio Ora" 
              value={activeEmployeesCount} 
              description="Presenze attive rilevate" 
              icon={Clock}
              trend={{ value: activeEmployeesCount > 0 ? 10 : 0, positive: true }}
            />
            <StatCard 
              title="Richieste Team" 
              value={pendingRequestsCount} 
              description="In attesa di approvazione" 
              icon={FileText}
              trend={{ value: pendingRequestsCount, positive: false }}
            />
            <StatCard 
              title="Turni Oggi" 
              value={allShifts?.filter(s => s.date === new Date().toISOString().split('T')[0]).length || 0} 
              description="Copertura pianificata" 
              icon={Calendar}
            />
          </div>

          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-black text-xl">Analisi Carico Lavoro</CardTitle>
                  <CardDescription>Ore settimanali stimate per l'intero team.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Bar dataKey="ore" radius={[4, 4, 0, 0]}>
                    {weeklyStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === (new Date().getDay() || 7) - 1 ? 'hsl(var(--primary))' : '#CBD5E1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-black text-xl">Presenze Recenti (Tutto il Team)</CardTitle>
              <CardDescription>Ultimi movimenti registrati nel punto vendita.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {isEntriesLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
                ) : recentEntries.length > 0 ? recentEntries.map((log) => {
                  const emp = employeeMap[log.employeeId];
                  return (
                    <div key={log.id} className="flex items-center gap-4">
                      <Avatar className="h-9 w-9 border shadow-sm">
                        <AvatarImage src={emp?.photoUrl} />
                        <AvatarFallback className="font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-[#1e293b]">{emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{emp?.jobTitle || "Personale"}</p>
                      </div>
                      <Badge variant={!log.checkOutTime ? "default" : "secondary"} className={!log.checkOutTime ? "bg-green-500" : "font-mono"}>
                        {new Date(log.checkInTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    </div>
                  )
                }) : (
                  <p className="text-sm text-center text-muted-foreground py-10 italic">Nessun movimento registrato oggi.</p>
                )}
              </div>
              <Link href="/admin/attendance" className="block mt-6">
                <Button variant="ghost" className="w-full text-xs font-black uppercase tracking-widest text-[#227FD8] hover:bg-[#227FD8]/5">Vedi Registro Completo</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Colonna Destra: Attività Personali Admin */}
        <div className="lg:col-span-4 space-y-8">
          <ClockInOut />

          <Card className="border-[#227FD8]/20 bg-[#227FD8]/5 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-[#227FD8] font-black uppercase text-[10px] tracking-wider">Il Mio Turno di Oggi</CardDescription>
              <CardTitle className="text-xl font-black text-[#1e293b]">
                {todayShift ? todayShift.title : "Nessun Turno"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayShift ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-[#1e293b]">
                    <Clock className="h-4 w-4 text-[#227FD8]" />
                    {new Date(todayShift.startTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - {new Date(todayShift.endTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <Badge className="bg-[#227FD8] font-bold">In Sede</Badge>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Oggi sei fuori turno o riposo.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardDescription className="font-black uppercase text-[10px] tracking-wider text-amber-600">I Miei Progressi 40h</CardDescription>
              <CardTitle className="text-xl font-black text-[#1e293b]">{myWeeklyHours} Ore</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-muted-foreground">Obiettivo Settimana</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Info className="h-3 w-3 text-amber-500" />
                <p className="text-[10px] font-medium text-muted-foreground italic">Statistiche calcolate sulle tue timbrature.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black">Azioni Rapide Personali</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/employee/requests" className="block">
                <Button variant="outline" className="w-full justify-start gap-2 font-bold text-sm border-[#227FD8] text-[#227FD8] hover:bg-[#227FD8]/5">
                  <Gift className="h-4 w-4" /> Richiedi Ferie/Permesso
                </Button>
              </Link>
              <Link href="/employee/attendance" className="block">
                <Button variant="outline" className="w-full justify-start gap-2 font-bold text-sm">
                  <Clock className="h-4 w-4" /> Vedi Mio Storico Presenze
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
