
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
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameMonth } from "date-fns"
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

  // Recupero Dati
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
    const monthStart = startOfMonth(targetDate)
    const monthEnd = endOfMonth(targetDate)

    return employees.map(emp => {
      // 1. Calcolo ore lavorate effettive (Timbrature nel mese selezionato)
      const empEntries = allEntries.filter(entry => {
        if (entry.employeeId !== emp.id) return false;
        if (entry.companyId !== "default" && entry.companyId) return false; // Filtro azienda
        
        const checkIn = entry.checkInTime ? parseISO(entry.checkInTime) : null;
        // Verifichiamo che la timbratura sia avvenuta nel mese/anno selezionato
        return checkIn && checkIn >= monthStart && checkIn <= monthEnd;
      });

      let totalWorkHours = 0;
      empEntries.forEach(entry => {
        if (entry.checkInTime && entry.checkOutTime) {
          const start = parseISO(entry.checkInTime).getTime();
          const end = parseISO(entry.checkOutTime).getTime();
          const diffMs = end - start;
          if (diffMs > 0) {
            totalWorkHours += diffMs / (1000 * 60 * 60);
          }
        }
      });

      // 2. Calcolo ore da richieste approvate (Ferie, Malattia, Permessi nel mese selezionato)
      const empRequests = allRequests.filter(req => {
        if (req.employeeId !== emp.id) return false;
        const status = (req.status || "").toUpperCase();
        if (status !== "APPROVATO" && status !== "APPROVED") return false;
        
        const reqStart = parseISO(req.startDate);
        // Verifichiamo che la richiesta sia nel mese selezionato
        return reqStart >= monthStart && reqStart <= monthEnd;
      });

      let vacationDays = 0;
      let sickDays = 0;
      let permitHours = 0;

      empRequests.forEach(req => {
        if (req.type === "VACATION") {
          vacationDays += 1;
        } else if (req.type === "SICK") {
          sickDays += 1;
        } else if (req.type === "HOURLY_PERMIT") {
          if (req.startTime && req.endTime) {
            const [h1, m1] = req.startTime.split(':').map(Number);
            const [h2, m2] = req.endTime.split(':').map(Number);
            const hours = (h2 + m2/60) - (h1 + m1/60);
            if (hours > 0) permitHours += hours;
          }
        } else if (req.type === "PERSONAL") {
          permitHours += 8; // Il permesso giornaliero conta come 8 ore
        }
      });

      const totalVacationHours = vacationDays * 8;
      const totalSickHours = sickDays * 8;

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        photoUrl: emp.photoUrl,
        jobTitle: emp.jobTitle,
        workHours: totalWorkHours.toFixed(1),
        vacationHours: totalVacationHours.toFixed(1),
        sickHours: totalSickHours.toFixed(1),
        permitHours: permitHours.toFixed(1),
        totalHours: (totalWorkHours + totalVacationHours + totalSickHours + permitHours).toFixed(1)
      }
    });
  }, [employees, allEntries, allRequests, selectedMonth, selectedYear]);

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
    }, 800)
  }

  const isLoading = employeesLoading || entriesLoading || requestsLoading || isRefreshing;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] flex items-center gap-3">
            <Calculator className="h-8 w-8 text-[#227FD8]" /> Conteggio Mensile
          </h1>
          <p className="text-slate-500 font-medium">Riepilogo ore lavorate, permessi e assenze del team per il periodo selezionato.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[150px] border-none font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] border-none font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
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
              <Users className="h-4 w-4" /> Dettaglio Collaboratori
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
                <TableHead className="text-xs font-black uppercase text-slate-500 pl-8">Collaboratore</TableHead>
                <TableHead className="text-xs font-black uppercase text-slate-500 text-center">Lavoro (h)</TableHead>
                <TableHead className="text-xs font-black uppercase text-slate-500 text-center">Ferie (h)</TableHead>
                <TableHead className="text-xs font-black uppercase text-slate-500 text-center">Malattia (h)</TableHead>
                <TableHead className="text-xs font-black uppercase text-slate-500 text-center">Permessi (h)</TableHead>
                <TableHead className="text-xs font-black uppercase text-slate-500 text-right pr-8">Totale Periodo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#227FD8]" />
                    <p className="text-sm font-bold text-slate-400 mt-4">Analisi dati in corso...</p>
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
                        <span className="font-bold text-slate-900">{row.name}</span>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-tight">{row.jobTitle}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-[#227FD8]">{row.workHours}</span>
                      <Badge variant="outline" className="text-[9px] h-4 bg-blue-50 border-blue-100 text-blue-600 px-1.5 uppercase font-black">Effettive</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-amber-600">{row.vacationHours}</span>
                      <Umbrella className="h-3 w-3 text-amber-400" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-rose-600">{row.sickHours}</span>
                      <Activity className="h-3 w-3 text-rose-400" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-cyan-600">{row.permitHours}</span>
                      <Timer className="h-3 w-3 text-cyan-400" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <span className="text-base font-black text-slate-900">{row.totalHours}h</span>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-slate-400 italic font-medium">
                    Nessuna attività registrata per il mese di {MONTHS.find(m => m.value === selectedMonth)?.label}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-blue-50/50 border-l-4 border-l-[#227FD8]">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-xs font-black uppercase text-blue-700 tracking-widest">Totale Ore Lavorate Team</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-2xl font-black text-slate-900">
              {reportData.reduce((acc, curr) => acc + parseFloat(curr.workHours), 0).toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-amber-50/50 border-l-4 border-l-amber-500">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-xs font-black uppercase text-amber-700 tracking-widest">Totale Ferie Team</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-2xl font-black text-slate-900">
              {reportData.reduce((acc, curr) => acc + parseFloat(curr.vacationHours), 0).toFixed(1)}h
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-rose-50/50 border-l-4 border-l-rose-500">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-xs font-black uppercase text-rose-700 tracking-widest">Totale Malattia Team</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-2xl font-black text-slate-900">
              {reportData.reduce((acc, curr) => acc + parseFloat(curr.sickHours), 0).toFixed(1)}h
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
