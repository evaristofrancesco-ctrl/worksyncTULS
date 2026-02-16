
"use client"

import { Clock, Download, Filter, Search, Loader2, Zap, UserCheck } from "lucide-react"
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
  const { data: entries, isLoading } = useCollection(timeEntriesQuery)

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
    const dayOfWeek = now.getDay().toString();

    const isWorkingDay = now.getDay() >= 1 && now.getDay() <= 6;

    if (!isWorkingDay) {
      toast({ title: "Punto Vendita Chiuso", description: "Oggi è domenica, non è possibile generare timbrature." });
      setIsGenerating(false);
      return;
    }

    try {
      let count = 0;
      for (const emp of employees) {
        if (emp.restDay === dayOfWeek || !emp.isActive) continue;

        const dateStr = now.toISOString().split('T')[0];

        if (emp.contractType === 'full-time') {
          const idAM = `auto-${emp.id}-${dateStr}-AM`;
          const refAM = doc(db, "employees", emp.id, "timeentries", idAM);
          const startAM = new Date(now); startAM.setHours(9, 0, 0, 0);
          const endAM = new Date(now); endAM.setHours(13, 0, 0, 0);
          
          setDocumentNonBlocking(refAM, {
            id: idAM,
            employeeId: emp.id,
            companyId: "default",
            checkInTime: startAM.toISOString(),
            checkOutTime: endAM.toISOString(),
            status: "PRESENT",
            isApproved: true,
            type: "AUTO"
          }, { merge: true });

          const idPM = `auto-${emp.id}-${dateStr}-PM`;
          const refPM = doc(db, "employees", emp.id, "timeentries", idPM);
          const startPM = new Date(now); startPM.setHours(17, 0, 0, 0);
          const endPM = new Date(now); endPM.setHours(20, 0, 0, 0);

          setDocumentNonBlocking(refPM, {
            id: idPM,
            employeeId: emp.id,
            companyId: "default",
            checkInTime: startPM.toISOString(),
            checkOutTime: endPM.toISOString(),
            status: "PRESENT",
            isApproved: true,
            type: "AUTO"
          }, { merge: true });
          
          count += 2;
        } 
        else {
          const idPT = `auto-${emp.id}-${dateStr}-PT`;
          const refPT = doc(db, "employees", emp.id, "timeentries", idPT);
          const startPT = new Date(now); startPT.setHours(17, 0, 0, 0);
          const endPT = new Date(now); endPT.setHours(20, 0, 0, 0);

          setDocumentNonBlocking(refPT, {
            id: idPT,
            employeeId: emp.id,
            companyId: "default",
            checkInTime: startPT.toISOString(),
            checkOutTime: endPT.toISOString(),
            status: "PRESENT",
            isApproved: true,
            type: "AUTO"
          }, { merge: true });
          
          count += 1;
        }
      }

      toast({ title: "Operazione Completata", description: `Generate ${count} timbrature per oggi (FT 9-13/17-20, PT 17-20).` });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Errore", description: "Si è verificato un problema." });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">⏱️ Registro Presenze Team</h1>
          <p className="text-muted-foreground">Monitoraggio timbrature manuali e automatiche del punto vendita.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleAutoClockIn} 
            disabled={isGenerating || isLoading}
            className="gap-2 bg-amber-500 hover:bg-amber-600 font-bold shadow-md"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}
            Timbratura Automatica
          </Button>
          <Button variant="outline" className="gap-2 font-bold">
            <Download className="h-4 w-4" /> Esporta Log
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm h-full">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#227FD8]" />
                  <CardTitle className="text-xl font-black">Storico Attività Team</CardTitle>
                </div>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Cerca dipendente..." 
                    className="pl-8 bg-muted/30 border-none focus-visible:ring-[#227FD8]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold">Collaboratore</TableHead>
                    <TableHead className="font-bold">Data</TableHead>
                    <TableHead className="font-bold">Entrata</TableHead>
                    <TableHead className="font-bold">Uscita</TableHead>
                    <TableHead className="font-bold">Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : filteredEntries.length > 0 ? filteredEntries.map((log) => {
                    const emp = employeeMap[log.employeeId];
                    const checkInDate = log.checkInTime ? new Date(log.checkInTime) : null;
                    const checkOutDate = log.checkOutTime ? new Date(log.checkOutTime) : null;

                    return (
                      <TableRow key={log.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border shadow-sm">
                              <AvatarImage src={emp?.photoUrl || `https://picsum.photos/seed/${log.employeeId}/100/100`} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-[#1e293b]">
                                {emp ? `${emp.firstName || ""} ${emp.lastName || ""}` : "Sconosciuto"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{emp?.jobTitle || "Personale"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {checkInDate && !isNaN(checkInDate.getTime()) ? checkInDate.toLocaleDateString('it-IT') : "--"}
                        </TableCell>
                        <TableCell className="text-sm font-mono font-bold text-[#227FD8]">
                          {checkInDate && !isNaN(checkInDate.getTime()) ? checkInDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                        </TableCell>
                        <TableCell className="text-sm font-mono font-bold text-slate-500">
                          {checkOutDate && !isNaN(checkOutDate.getTime()) ? checkOutDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={!log.checkOutTime ? "default" : "secondary"} className={!log.checkOutTime ? "bg-green-500" : "font-bold"}>
                            {!log.checkOutTime ? "In Servizio" : log.type === "AUTO" ? "Automatica" : "Manuale"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  }) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center text-muted-foreground italic">
                        Nessun log trovato.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-lg font-black">Mia Timbratura</CardTitle>
              </div>
              <CardDescription>Usa questo modulo per la tua presenza personale.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ClockInOut />
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm bg-blue-600 text-white overflow-hidden">
            <CardContent className="p-6">
              <h4 className="font-black uppercase tracking-tighter text-blue-100 text-xs mb-2">Statistiche Veloci</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold">Presenti Oggi</span>
                  <span className="text-3xl font-black">{new Set(filteredEntries.filter(e => new Date(e.checkInTime).toDateString() === new Date().toDateString()).map(e => e.employeeId)).size}</span>
                </div>
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-2/3" />
                </div>
                <p className="text-[10px] text-blue-100 font-medium">Copertura stimata basata sui turni pianificati.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
