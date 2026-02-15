"use client"

import { Clock, Download, Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const attendanceLogs = [
  { id: 1, name: "Michael Chen", date: "2024-04-23", clockIn: "08:55", clockOut: "17:05", status: "Presente" },
  { id: 2, name: "Elena Rodriguez", date: "2024-04-23", clockIn: "09:12", clockOut: "18:00", status: "Presente" },
  { id: 3, name: "David Kim", date: "2024-04-23", clockIn: "09:45", clockOut: "-", status: "Ritardo" },
  { id: 4, name: "Sarah Johnson", date: "2024-04-23", clockIn: "08:30", clockOut: "16:30", status: "Presente" },
]

export default function AttendancePage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registro Presenze</h1>
          <p className="text-muted-foreground">Monitora gli ingressi e le uscite del personale in tempo reale.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" /> Filtra
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Esporta CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Log Attività Odierna</CardTitle>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cerca dipendente..." className="pl-8 bg-muted/50 border-none" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dipendente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Entrata</TableHead>
                <TableHead>Uscita</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://picsum.photos/seed/${log.name}/100/100`} />
                        <AvatarFallback>{log.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{log.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{log.date}</TableCell>
                  <TableCell className="text-sm font-mono">{log.clockIn}</TableCell>
                  <TableCell className="text-sm font-mono">{log.clockOut}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === "Ritardo" ? "destructive" : "secondary"}>
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
