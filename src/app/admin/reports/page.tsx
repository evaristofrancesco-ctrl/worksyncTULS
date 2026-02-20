
"use client"

import { useState, useMemo } from "react"
import { 
  Calculator, 
  Calendar, 
  Download, 
  Users, 
  Clock, 
  Umbrella, 
  Activity, 
  Timer,
  Loader2,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, collectionGroup } from "firebase/firestore"
import { startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"
import { cn } from "@/lib/utils"

const MONTHS = [
  { label: "Gennaio", value: "0" },
  { label: "Febbraio", value: "1" },
  { label: "Marzo", value: "2" },
  { label: "Aprile", value: "3" },
  { label: "Maggio", value: "4" },
  { label: "Giugno", value: "5" },
  { label: "Luglio", value: "6" },
  { label: "Agosto", value: "7" },
  { label: "Settembre", value: "8" },
  { label: "Ottobre", value: "9" },
  { label: "Novembre", value: "10" },
  { label: "Dicembre", value: "11" },
]

export default function ReportsPage() {
  const db = useFirestore()
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const yearsOptions = useMemo(() => {
    const current = new Date().getFullYear()
    const years = []
    for (let i = current - 3; i <= current + 1; i++) {
      years.push(i.toString())
    }
    return years.reverse()
  }, [])

  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees, isLoading: employeesLoading } = useCollection(employeesQuery)

  const timeEntriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, "timeentries");
  }, [db])
  const { data: allEntries, isLoading: entriesLoading } = useCollection(timeEntriesQuery)

  const requestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, "requests");
  }, [db])
  const { data: allRequests, isLoading: requestsLoading } = useCollection(requestsQuery)

  const reportData = useMemo(() => {
    if (!employees || !allEntries || !allRequests) return [];

    const targetDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    // Esclusione Francesco Evaristo (richiesta specifica precedente)
    const targetEmployees = employees.filter(emp => {
      const isFrancesco = emp.firstName?.toLowerCase() === 'francesco' && emp.lastName?.toLowerCase() === 'evaristo';
      return !isFrancesco;
    });

    return targetEmployees.map(emp => {
      // Filtra le timbrature del dipendente per il mese selezionato
      const empEntries = allEntries.filter(entry => {
        if (entry.employeeId !== emp.id) return false;
        if (entry.companyId !== "default") return false;
        try {
          const checkIn = new Date(entry.checkInTime);
          return checkIn >= monthStart && checkIn <= monthEnd;
        } catch (e) { return false; }
      });

      // Calcolo totale ore timbrate nel mese (differenza reale check-out - check-in)
      let actualWorkHours = 0;
      empEntries.forEach(entry => {
        if (entry.checkInTime && entry.checkOutTime) {
          const start = new Date(entry.checkInTime).getTime();
          const end = new Date(entry.checkOutTime).getTime();
          const diffMs = end - start;
          if (diffMs > 0) actualWorkHours += diffMs / (1000 * 60 * 60);
        }
      });

      // Calcolo assenze approvate
      const empRequests = allRequests.filter(req => {
        if (req.employeeId !== emp.id) return false;
        const status = (req.status || "").toUpperCase();
        if (status !== "APPROVATO" && status !== "APPROVED" && status !== "Approvato") return false;
        try {
          const reqStart = new Date(req.startDate);
          const reqEnd = req.endDate ? new Date(req.endDate) : reqStart;
          return (reqStart <= monthEnd && reqEnd >= monthStart);
        } catch (e) { return false; }
      });

      let vacationHours = 0;
      let sickHours = 0;
      let permitHours = 0;

      empRequests.forEach(req => {
        try {
          const rStart = new Date(req.startDate);
          const rEnd = req.endDate ? new Date(req.endDate) : rStart;
          
          const overlapStart = rStart < monthStart ? monthStart : rStart;
          const overlapEnd = rEnd > monthEnd ? monthEnd : rEnd;
          
          if (overlapStart > overlapEnd) return;

          const daysInInterval = eachDayOfInterval({ start: overlapStart, end: overlapEnd });
          const count = daysInInterval.length;

          if (req.type === "VACATION") vacationHours += count * 8;
          else if (req.type === "SICK") sickHours += count * 8;
          else if (req.type === "PERSONAL") permitHours += count * 8;
          else if (req.type === "HOURLY_PERMIT") {
            if (req.startTime && req.endTime) {
              const [h1, m1] = req.startTime.split(':').map(Number);
              const [h2, m2] = req.endTime.split(':').map(Number);
              const hours = (h2 + m2/60) - (h1 + m1/60);
              if (hours > 0) permitHours += (hours * count);
            }
          }
        } catch (e) {}
      });

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        photoUrl: emp.photoUrl,
        jobTitle: emp.jobTitle,
        workedHours: actualWorkHours.toFixed(1),
        vacationHours: vacationHours.toFixed(1),
        sickHours: sickHours.toFixed(1),
        permitHours: permitHours.toFixed(1),
        totalHours: actualWorkHours.toFixed(1) // Ore nette basate su timbrature reali
      }
    });
  }, [employees, allEntries, allRequests, selectedMonth, selectedYear]);

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 800)
  }

  const isLoading = employeesLoading || entriesLoading || requestsLoading || isRefreshing;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] flex items-center gap-3">
            <Calculator className="h-8 w-8 text-[#227FD8]" /> Conteggio Mensile
          </h1>
          <p className="text-slate-500 font-medium">Calcolo basato sulle <b>timbrature reali</b> dei collaboratori.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[150px] border-none font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] border-none font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearsOptions.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

          <Button 
            variant="ghost" 
            size="sm" 
            className="h-10 gap-2 font-bold text-[#227FD8] hover:bg-blue-50"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Ricalcola
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Users className="h-4 w-4" /> Analisi Presenze Effettive
            </CardTitle>
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-2">
              <Download className="h-3.5 w-3.5" /> Esporta Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="h-12">
                <TableHead className="text-sm font-bold uppercase text-slate-500 pl-8">Collaboratore</TableHead>
                <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Timbrate (h)</TableHead>
                <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Ferie (h)</TableHead>
                <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Malattia (h)</TableHead>
                <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Permessi (h)</TableHead>
                <TableHead className="text-right text-sm font-bold uppercase pr-8 text-slate-500">Ore Nette</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#227FD8]" />
                    <p className="text-sm font-bold text-slate-400 mt-4">Analisi presenze in corso...</p>
                  </TableCell>
                </TableRow>
              ) : reportData.length > 0 ? reportData.map((row) => (
                <TableRow key={row.id} className="h-16 hover:bg-slate-50/50 transition-colors">
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border shadow-sm">
                        <AvatarImage src={row.photoUrl} />
                        <AvatarFallback className="font-bold">{row.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-base">{row.name}</span>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">{row.jobTitle}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-bold text-slate-600">{row.workedHours}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-bold text-amber-600">{row.vacationHours}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-bold text-rose-600">{row.sickHours}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-bold text-cyan-600">{row.permitHours}</span>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <span className="text-lg font-black text-[#227FD8]">{row.totalHours}h</span>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-slate-400 italic font-medium">
                    Nessuna timbratura trovata per il periodo selezionato.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
