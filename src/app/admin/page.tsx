"use client"

import { Users, Calendar, Clock, FileText, ArrowUpRight, TrendingUp } from "lucide-react"
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

const weeklyStats = [
  { name: 'Lun', ore: 145 },
  { name: 'Mar', ore: 160 },
  { name: 'Mer', ore: 155 },
  { name: 'Gio', ore: 180 },
  { name: 'Ven', ore: 170 },
  { name: 'Sab', ore: 60 },
  { name: 'Dom', ore: 40 },
]

const recentEmployees = [
  { id: 1, name: "Michael Chen", role: "Sviluppo", status: "Presente", time: "08:55" },
  { id: 2, name: "Elena Rodriguez", role: "Design", status: "Presente", time: "09:12" },
  { id: 3, name: "David Kim", role: "Vendite", status: "Ritardo", time: "09:45" },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Amministratore</h1>
        <p className="text-muted-foreground">Bentornato, ecco cosa sta succedendo oggi in TU.L.A.S.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Dipendenti Totali" 
          value="124" 
          description="4 nuovi dall'ultimo mese" 
          icon={Users}
          trend={{ value: 12, positive: true }}
        />
        <StatCard 
          title="Turni Programmati" 
          value="48" 
          description="Per oggi, 23 Apr" 
          icon={Calendar}
        />
        <StatCard 
          title="Attivi Ora" 
          value="32" 
          description="Dipendenti attualmente al lavoro" 
          icon={Clock}
          trend={{ value: 8, positive: true }}
        />
        <StatCard 
          title="Richieste Pendenti" 
          value="15" 
          description="Ferie e cambi turno in attesa" 
          icon={FileText}
          trend={{ value: 2, positive: false }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Analisi Ore di Lavoro</CardTitle>
                <CardDescription>Totale ore del team registrate questa settimana.</CardDescription>
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

        <Card className="col-span-full lg:col-span-3">
          <CardHeader>
            <CardTitle>Presenze in Tempo Reale</CardTitle>
            <CardDescription>Dipendenti che hanno timbrato recentemente.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentEmployees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={`https://picsum.photos/seed/${emp.name}/100/100`} />
                    <AvatarFallback>{emp.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.role}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={emp.status === "Ritardo" ? "destructive" : "secondary"}>
                      {emp.time}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-6 text-primary hover:text-primary hover:bg-primary/5">
              Vedi tutti i record
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
