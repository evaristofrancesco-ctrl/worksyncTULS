
"use client"

import { Clock, Download, Search, Loader2, Zap, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ClockInOut } from "@/components/attendance/ClockInOut"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, collectionGroup, doc } from "firebase/firestore"
import { useState, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function AttendancePage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

  const timeEntriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, "timeentries");
  }, [db])
  const { data: entries, isLoading: isLoading } = useCollection(timeEntriesQuery)

  const employeeMap = useMemo(() => {
    if (!employees) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      return acc;
    }, {} as any);
  }, [employees]);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    return entries
      .filter(entry => {
        if (entry.companyId !== "default") return false;
        const emp = employeeMap[entry.employeeId];
        if (!emp) return false;
        const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        const dateA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
        const dateB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
        return dateB - dateA;
      });
  }, [entries, employeeMap, searchQuery]);

  const handleAutoClockIn = async () => {
    if (!employees || employees.length === 0) {
      toast({ variant: "destructive", title: "Errore", description: "Nessun dipendente trovato." });
      return;
    }
    setIsGenerating(true);
    const now = new Date();
    const isWorkingDay = now.getDay() >= 1 && now.getDay() <= 6;
    if (!isWorkingDay) {
      toast({ title: "Chiuso", description: "Oggi è domenica." });
      setIsGenerating(false);
      return;
    }
    
    try {
      let count = 0;
      for (const emp of employees) {
        if (!emp.isActive || emp.autoClockIn === false) continue;
        
        const dayOfWeekStr = now.getDay().toString();
        const isRestDay = dayOfWeekStr === emp.restDay;
        const rStart = emp.restStartTime || "00:00";
        const rEnd = emp.restEndTime || "00:00";
        const dateStr = now.toISOString().split('T')[0];

        if (emp.contractType === 'full-time') {
          // Mattina 09:00 - 13:00 (Check se sovrapposto a riposo orario)
          const morningOverlaps = isRestDay && ("09:00" < rEnd && "13:00" > rStart);
          if (!morningOverlaps) {
            const idAM = `auto-${emp.id}-${dateStr}-MORNING`;
            const checkInAM = new Date(now); checkInAM.setHours(9, 0, 0);
            const checkOutAM = new Date(now); checkOutAM.setHours(13, 0, 0);
            setDocumentNonBlocking(doc(db, "employees", emp.id, "timeentries", idAM), {
              id: idAM, employeeId: emp.id, companyId: "default", checkInTime: checkInAM.toISOString(), checkOutTime: checkOutAM.toISOString(), status: "PRESENT", isApproved: true, type: "AUTO", slot: "MORNING"
            }, { merge: true });
            count++;
          }

          // Pomeriggio 17:00 - 20:20 (Check se sovrapposto a riposo orario)
          const afternoonOverlaps = isRestDay && ("17:00" < rEnd && "20:20" > rStart);
          if (!afternoonOverlaps) {
            const idPM = `auto-${emp.id}-${dateStr}-AFTERNOON`;
            const checkInPM = new Date(now); checkInPM.setHours(17, 0, 0);
            const checkOutPM = new Date(now); checkOutPM.setHours(20, 20, 0);
            setDocumentNonBlocking(doc(db, "employees", emp.id, "timeentries", idPM), {
              id: idPM, employeeId: emp.id, companyId: "default", checkInTime: checkInPM.toISOString(), checkOutTime: checkOutPM.toISOString(), status: "PRESENT", isApproved: true, type: "AUTO", slot: "AFTERNOON"
            }, { merge: true });
            count++;
          }
        } else {
          // Part-time Pomeriggio 17:00 - 20:20
          const afternoonOverlaps = isRestDay && ("17:00" < rEnd && "20:20" > rStart);
          if (!afternoonOverlaps) {
            const idPM = `auto-${emp.id}-${dateStr}-AFTERNOON`;
            const checkInPM = new Date(now); checkInPM.setHours(17, 0, 0);
            const checkOutPM = new Date(now); checkOutPM.setHours(20, 20, 0);
            setDocumentNonBlocking(doc(db, "employees", emp.id, "timeentries", idPM), {
              id: idPM, employeeId: emp.id, companyId: "default", checkInTime: checkInPM.toISOString(), checkOutTime: checkOutPM.toISOString(), status: "PRESENT", isApproved: true, type: "AUTO", slot: "AFTERNOON"
            }, { merge: true });
            count++;
          }
        }
      }
      toast({ title: "Completato", description: `Generate ${count} timbrature rispettando i riposi orari.` });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1e293b]">Registro Presenze</h1>
          <p className="text-sm text-muted-foreground">Monitoraggio timbrature del punto vendita.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAutoClockIn} disabled={isGenerating || isLoading} size="sm" className="bg-amber-500 hover:bg-amber-600 font-bold h-9">
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1 fill-current" />} Timbratura Automatica
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8 border-none shadow-sm bg-white/80">
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#227FD8]" /> Storico Team
            </CardTitle>
            <div className="relative w-full max-w-[240px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Cerca collaboratore..." className="pl-8 bg-muted/30 border-none h-8 text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="h-10">
                  <TableHead className="text-sm font-black uppercase py-0 pl-4">Dipendente</TableHead>
                  <TableHead className="text-sm font-black uppercase py-0">Data</TableHead>
                  <TableHead className="text-sm font-black uppercase py-0">Entrata</TableHead>
                  <TableHead className="text-sm font-black uppercase py-0">Uscita</TableHead>
                  <TableHead className="text-sm font-black uppercase py-0 pr-4">Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredEntries.length > 0 ? filteredEntries.map((log) => {
                  const emp = employeeMap[log.employeeId];
                  const cIn = log.checkInTime ? new Date(log.checkInTime) : null;
                  const cOut = log.checkOutTime ? new Date(log.checkOutTime) : null;
                  return (
                    <TableRow key={log.id} className="h-12 hover:bg-muted/10">
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border">
                            <AvatarImage src={emp?.photoUrl} />
                            <AvatarFallback className="text-sm font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-sm text-[#1e293b] truncate">
                            {emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{cIn?.toLocaleDateString('it-IT')}</TableCell>
                      <TableCell className="text-sm font-bold text-[#227FD8]">{cIn?.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell className="text-sm font-bold text-slate-500">{cOut?.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) || "--:--"}</TableCell>
                      <TableCell className="pr-4">
                        <Badge variant={!log.checkOutTime ? "default" : "secondary"} className={`h-5 text-[10px] font-black ${!log.checkOutTime ? "bg-green-500" : ""}`}>
                          {!log.checkOutTime ? "In Servizio" : log.type === "AUTO" ? "AUTO" : "MANUALE"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                }) : (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">Nessun log trovato.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-sm bg-white/80">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-sm font-black flex items-center gap-2"><UserCheck className="h-4 w-4 text-amber-500" /> Mia Timbratura</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0"><ClockInOut /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
