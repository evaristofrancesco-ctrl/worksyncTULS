"use client"

import { Users, Calendar, Clock, FileText, ArrowUpRight, Loader2 } from "lucide-react"
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
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, collectionGroup } from "firebase/firestore"
import Link from "next/link"
import { useMemo } from "react"

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

  // Dati reali dipendenti
  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

  // Dati reali presenze
  const timeEntriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, "timeentries");
  }, [db])
  const { data: entries, isLoading: isEntriesLoading } = useCollection(timeEntriesQuery)

  // Mappa dei dipendenti memoizzata
  const employeeMap = useMemo(() => {
    if (!employees) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      return acc;
    }, {} as any);
  }, [employees]);

  // Voci recenti (Filtrate e ordinate in memoria)
  const recentEntries = useMemo(() => {
    if (!entries) return [];
    return [...entries]
      .filter(e => e.companyId === "default" && e.checkInTime)
      .sort((a, b) => {
        const dateA = new Date(a.checkInTime).getTime();
        const dateB = new Date(b.checkInTime).getTime();
        return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
      })
      .slice(0, 5);
  }, [entries]);

  // Conteggio dipendenti attivi
  const activeEmployeesCount = useMemo(() => {
    if (!entries) return 0;
    const todayStr = new Date().toDateString();
    return entries.filter(e => {
      if (e.companyId !== "default") return false;
      const d = e.checkInTime ? new Date(e.checkInTime) : null;
      return d && !isNaN(d.getTime()) && d.toDateString() === todayStr && !e.checkOutTime;
    }).length;
  }, [entries]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#1e293b]">Dashboard Amministratore</h1>
        <p className="text-muted-foreground">Bentornato, ecco cosa sta succedendo oggi in TU.L.S.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Dipendenti Totali" 
          value={employees?.length || 0} 
          description="Gestione anagrafica attiva" 
          icon={Users}
        />
        <StatCard 
          title="Turni Oggi" 
          value="--" 
          description="Pianificazione giornaliera" 
          icon={Calendar}
        />
        <StatCard 
          title="In Servizio Ora" 
          value={activeEmployeesCount} 
          description="Dipendenti attualmente al lavoro" 
          icon={Clock}
          trend={{ value: activeEmployeesCount > 0 ? 10 : 0, positive: true }}
        />
        <StatCard 
          title="Richieste Pendenti" 
          value="--" 
          description="Ferie e permessi in attesa" 
          icon={FileText}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4 border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Analisi Ore di Lavoro</CardTitle>
                <CardDescription>Ore settimanali stimate per il team.</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-1">
                Dettagli <ArrowUpRight className="h-4 w-4" />
              </Button>
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
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="ore" radius={[4, 4, 0, 0]}>
                  {weeklyStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 3 ? 'hsl(var(--accent))' : 'hsl(var(--primary))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-full lg:col-span-3 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Presenze Recenti</CardTitle>
            <CardDescription>Ultimi ingressi registrati.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {isEntriesLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin h-6 w-6" /></div>
              ) : recentEntries.length > 0 ? recentEntries.map((log) => {
                const emp = employeeMap[log.employeeId];
                const checkInDate = log.checkInTime ? new Date(log.checkInTime) : null;
                return (
                  <div key={log.id} className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={emp?.photoUrl || `https://picsum.photos/seed/${log.employeeId}/100/100`} />
                      <AvatarFallback>{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-bold leading-none">{emp ? `${emp.firstName || ""} ${emp.lastName || ""}` : "Sconosciuto"}</p>
                      <p className="text-xs text-muted-foreground">{emp?.jobTitle || "Dipendente"}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={!log.checkOutTime ? "default" : "secondary"}>
                        {checkInDate && !isNaN(checkInDate.getTime()) ? checkInDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                      </Badge>
                    </div>
                  </div>
                )
              }) : (
                <p className="text-sm text-center text-muted-foreground py-10">Nessun log recente.</p>
              )}
            </div>
            <Link href="/admin/attendance" className="block w-full mt-6">
              <Button variant="ghost" className="w-full text-primary hover:text-primary hover:bg-primary/5 font-bold">
                Vedi tutti i record
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
