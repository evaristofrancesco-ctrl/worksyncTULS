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
  LineChart,
  Line,
  Cell
} from "recharts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const weeklyStats = [
  { name: 'Mon', hours: 145 },
  { name: 'Tue', hours: 160 },
  { name: 'Wed', hours: 155 },
  { name: 'Thu', hours: 180 },
  { name: 'Fri', hours: 170 },
  { name: 'Sat', hours: 60 },
  { name: 'Sun', hours: 40 },
]

const recentEmployees = [
  { id: 1, name: "Michael Chen", role: "Dev", status: "Active", time: "8:55 AM" },
  { id: 2, name: "Elena Rodriguez", role: "Design", status: "Active", time: "9:12 AM" },
  { id: 3, name: "David Kim", role: "Sales", status: "Late", time: "9:45 AM" },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Workforce Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, here's what's happening today at WorkSync.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Employees" 
          value="124" 
          description="4 new since last month" 
          icon={Users}
          trend={{ value: 12, positive: true }}
        />
        <StatCard 
          title="Scheduled Shifts" 
          value="48" 
          description="For today, Apr 23" 
          icon={Calendar}
        />
        <StatCard 
          title="Active Now" 
          value="32" 
          description="Employees currently clocked in" 
          icon={Clock}
          trend={{ value: 8, positive: true }}
        />
        <StatCard 
          title="Pending Requests" 
          value="15" 
          description="Leave and shift swap requests" 
          icon={FileText}
          trend={{ value: 2, positive: false }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Work Hours Analysis</CardTitle>
                <CardDescription>Total team hours logged per day this week.</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-1">
                Details <ArrowUpRight className="h-4 w-4" />
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
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
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
            <CardTitle>Real-time Attendance</CardTitle>
            <CardDescription>Recently clocked in employees.</CardDescription>
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
                    <Badge variant={emp.status === "Late" ? "destructive" : "secondary"}>
                      {emp.time}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-6 text-primary hover:text-primary hover:bg-primary/5">
              View all records
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}