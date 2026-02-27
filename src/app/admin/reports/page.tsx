
"use client"

import { useState, useMemo } from "react"
import { 
  Calculator, 
  Download, 
  Users, 
  Loader2,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, collectionGroup } from "firebase/firestore"
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO } from "date-fns"
import { it } from "date-fns/locale"
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
  const { user } = useUser()
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const yearsOptions = useMemo(() => {
    const current = new Date().getFullYear()
    const years = []
    for (let i = current - 2; i <= current + 1; i++) {
      years.push(i.toString())
    }
    return years.reverse()
  }, [])

  const employeesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "employees");
  }, [db, user])
  const { data: employees, isLoading: employeesLoading } = useCollection(employeesQuery)

  const timeEntriesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collectionGroup(db, "timeentries");
  }, [db, user])
  const { data: allEntries, isLoading: entriesLoading } = useCollection(timeEntriesQuery)

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collectionGroup(db, "requests");
  }, [db, user])
  const { data: allRequests, isLoading: requestsLoading } = useCollection(requestsQuery)

  const shiftsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collectionGroup(db, "shifts");
  }, [db, user])
  const { data: allShifts, isLoading: shiftsLoading } = useCollection(shiftsQuery)

  const formatTime = (decimalHours: number) => {
    const isNegative = decimalHours < 0;
    const absHours = Math.abs(decimalHours);
    const totalMinutes = Math.round(absHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0 && minutes === 0) return "0h";
    let formatted = "";
    if (hours > 0) formatted += `${hours}h`;
    if (minutes > 0) {
      if (hours > 0) formatted += " ";
      formatted += `${minutes}m`;
    }
    return isNegative ? `-${formatted}` : formatted;
  };

  const reportData = useMemo(() => {
    if (!employees || !allEntries || !allRequests || !allShifts) return [];

    const selMonthInt = parseInt(selectedMonth);
    const selYearInt = parseInt(selectedYear);
    const monthStart = startOfMonth(new Date(selYearInt, selMonthInt, 1));
    const monthEnd = endOfMonth(new Date(selYearInt, selMonthInt, 1));
    
    // Mappaggio Timbrature filtrato per mese/anno (usando la stringa della data per evitare offset UTC)
    const entriesMap = allEntries.reduce((acc, entry) => {
      if (!entry.checkInTime) return acc;
      const datePart = entry.checkInTime.split('T')[0]; // yyyy-MM-dd
      const [y, m] = datePart.split('-').map(Number);
      
      if (y === selYearInt && (m - 1) === selMonthInt) {
        if (!acc[entry.employeeId]) acc[entry.employeeId] = [];
        acc[entry.employeeId].push(entry);
      }
      return acc;
    }, {} as Record<string, any[]>);

    // Mappaggio Richieste Approva (usando la data stringa)
    const requestsMap = allRequests.reduce((acc, req) => {
      const status = (req.status || "").toUpperCase();
      if (status === "APPROVATO" || status === "APPROVED" || status === "Approvato") {
        const datePart = req.startDate; // yyyy-MM-dd
        const [y, m] = datePart.split('-').map(Number);
        if (y === selYearInt && (m - 1) === selMonthInt) {
          if (!acc[req.employeeId]) acc[req.employeeId] = [];
          acc[req.employeeId].push(req);
        }
      }
      return acc;
    }, {} as Record<string, any[]>);

    // Mappaggio Turni/Straordinari (usando la data stringa)
    const shiftsMap = allShifts.reduce((acc, shift) => {
      const datePart = shift.date; // yyyy-MM-dd
      if (datePart) {
        const [y, m] = datePart.split('-').map(Number);
        if (y === selYearInt && (m - 1) === selMonthInt) {
          if (!acc[shift.employeeId]) acc[shift.employeeId] = [];
          acc[shift.employeeId].push(shift);
        }
      }
      return acc;
    }, {} as Record<string, any[]>);

    const AFTERNOON_HOURS = 3 + (20 / 60);

    return employees.filter(emp => {
      const isFrancesco = emp.firstName?.toLowerCase() === 'francesco' && emp.lastName?.toLowerCase() === 'evaristo';
      return !isFrancesco;
    }).map(emp => {
      let monthlyExpectedHours = 0;
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      daysInMonth.forEach(day => {
        const dayOfWeekStr = day.getDay().toString();
        if (dayOfWeekStr === "0") return;

        const isRestDay = dayOfWeekStr === emp.restDay;
        const rStart = emp.restStartTime || "00:00";
        const rEnd = emp.restEndTime || "00:00";

        const isSavino = emp.firstName?.toLowerCase().includes('savino') || emp.lastName?.toLowerCase().includes('savino');

        if (isSavino) {
          const dayIdx = day.getDay();
          let amHours = 1;
          if (dayIdx === 4) amHours = 4;
          else if (dayIdx === 6) amHours = 2;
          let pmHours = AFTERNOON_HOURS;
          monthlyExpectedHours += (amHours + pmHours);
        } else {
          if (emp.contractType === 'full-time') {
            const morningOverlaps = isRestDay && ("09:00" < rEnd && "13:00" > rStart);
            if (!morningOverlaps) monthlyExpectedHours += 4;
            const afternoonOverlaps = isRestDay && ("17:00" < rEnd && "20:20" > rStart);
            if (!afternoonOverlaps) monthlyExpectedHours += AFTERNOON_HOURS;
          } else {
            const afternoonOverlaps = isRestDay && ("17:00" < rEnd && "20:20" > rStart);
            if (!afternoonOverlaps) monthlyExpectedHours += AFTERNOON_HOURS;
          }
        }
      });

      const empEntries = entriesMap[emp.id] || [];
      let actualWorkHours = 0;
      empEntries.forEach(entry => {
        if (entry.checkInTime && entry.checkOutTime) {
          const start = new Date(entry.checkInTime).getTime();
          const end = new Date(entry.checkOutTime).getTime();
          const diffMs = end - start;
          if (diffMs > 0) actualWorkHours += diffMs / (1000 * 60 * 60);
        }
      });

      const empRequests = requestsMap[emp.id] || [];
      const empShifts = shiftsMap[emp.id] || [];
      const empOvertimeShifts = empShifts.filter(s => s.type === 'OVERTIME');

      let vacationHours = 0;
      let sickHours = 0;
      let permitHours = 0;
      let overtimeHours = 0;
      let detailEntries: string[] = [];

      // Calcolo Assenze
      empRequests.forEach(req => {
        try {
          const rStart = parseISO(req.startDate);
          const rEnd = req.endDate ? parseISO(req.endDate) : rStart;
          
          const daysInInterval = eachDayOfInterval({ 
            start: rStart < monthStart ? monthStart : rStart, 
            end: rEnd > monthEnd ? monthEnd : rEnd 
          });
          const count = daysInInterval.length;
          
          let hForThisReq = 0;
          let timeInfo = "";
          const typeLabel = req.type === 'VACATION' ? 'Ferie' : req.type === 'SICK' ? 'Malattia' : req.type === 'HOURLY_PERMIT' ? 'Permesso Orario' : 'Permesso';

          if (req.type === "VACATION") { vacationHours += count * 8; hForThisReq = 8; }
          else if (req.type === "SICK") { sickHours += count * 8; hForThisReq = 8; }
          else if (req.type === "PERSONAL") { permitHours += count * 8; hForThisReq = 8; }
          else if (req.type === "HOURLY_PERMIT") {
            if (req.startTime && req.endTime) {
              const [h1, m1] = req.startTime.split(':').map(Number);
              const [h2, m2] = req.endTime.split(':').map(Number);
              const diff = (h2 + m2/60) - (h1 + m1/60);
              if (diff > 0) {
                permitHours += (diff * count);
                hForThisReq = diff;
                timeInfo = ` (${req.startTime}-${req.endTime})`;
              }
            }
          }

          daysInInterval.forEach(d => { 
            detailEntries.push(`${format(d, 'dd/MM')} ${typeLabel}${timeInfo} [${formatTime(hForThisReq)}]`); 
          });
        } catch (e) {}
      });

      // Calcolo Straordinari (Somma delle durate dei badge Verde Smeraldo)
      empOvertimeShifts.forEach(s => {
        const start = new Date(s.startTime).getTime();
        const end = new Date(s.endTime).getTime();
        const diffHours = (end - start) / (1000 * 60 * 60);
        if (diffHours > 0) {
          overtimeHours += diffHours;
          detailEntries.push(`${format(parseISO(s.date), 'dd/MM')} Straordinario [${formatTime(diffHours)}]`);
        }
      });

      // Ore Nette = Lavorate + Extra
      // Le assenze (Ferie/Permessi) sono riportate a parte per chiarezza contabile
      const netTotalHours = actualWorkHours + overtimeHours;

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        photoUrl: emp.photoUrl,
        jobTitle: emp.jobTitle,
        expectedHoursFormatted: formatTime(monthlyExpectedHours),
        workedHoursFormatted: formatTime(actualWorkHours),
        vacationHoursFormatted: formatTime(vacationHours),
        sickHoursFormatted: formatTime(sickHours),
        permitHoursFormatted: formatTime(permitHours),
        overtimeHoursFormatted: formatTime(overtimeHours),
        totalHoursFormatted: formatTime(netTotalHours),
        isSubtracted: false, // Non più sottratte nel calcolo netto basato sulle timbrature
        isAdded: overtimeHours > 0,
        absenceDetailStr: detailEntries.join(" | ")
      }
    });
  }, [employees, allEntries, allRequests, allShifts, selectedMonth, selectedYear]);

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 800)
  }

  const handleExportCSV = () => {
    if (!reportData.length) return;

    const headers = ["Collaboratore", "Ruolo", "Ore Previste", "Ore Lavorate (Lorde)", "Ferie (h)", "Malattia (h)", "Permessi (h)", "Straordinari (h)", "Ore Nette", "Dettaglio Assenze/Extra"];
    const rows = reportData.map(r => [
      r.name,
      r.jobTitle,
      r.expectedHoursFormatted,
      r.workedHoursFormatted,
      r.vacationHoursFormatted,
      r.sickHoursFormatted,
      r.permitHoursFormatted,
      r.overtimeHoursFormatted,
      r.totalHoursFormatted,
      `"${r.absenceDetailStr}"`
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(e => e.join(";"))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Report_Dettagliato_${MONTHS[parseInt(selectedMonth)].label}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = employeesLoading || entriesLoading || requestsLoading || shiftsLoading || isRefreshing;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] flex items-center gap-3">
            <Calculator className="h-8 w-8 text-[#227FD8]" /> Conteggio Mensile
          </h1>
          <p className="text-slate-500 font-medium">Ore previste vs <b>ore nette</b> (timbrate + straordinari).</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[150px] border-none font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] border-none font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearsOptions.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />
          <Button variant="ghost" size="sm" className="h-10 gap-2 font-bold text-[#227FD8] hover:bg-blue-50" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} /> Ricalcola
          </Button>
          <Button variant="outline" size="sm" className="h-10 gap-2 font-bold border-[#227FD8] text-[#227FD8] hover:bg-blue-50" onClick={handleExportCSV} disabled={isLoading || reportData.length === 0}>
            <Download className="h-4 w-4" /> Esporta CSV
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Users className="h-4 w-4" /> Analisi Presenze e Contratto
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="h-12">
                <TableHead className="text-sm font-bold uppercase text-slate-500 pl-8">Collaboratore</TableHead>
                <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Previste (h/mese)</TableHead>
                <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Ferie (h)</TableHead>
                <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Malattia (h)</TableHead>
                <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Permessi (h)</TableHead>
                <TableHead className="text-sm font-bold uppercase text-slate-500 text-center text-emerald-600">Extra (h)</TableHead>
                <TableHead className="text-right text-sm font-bold uppercase pr-8 text-slate-500">Ore Nette</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-64 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#227FD8]" /><p className="text-sm font-bold text-slate-400 mt-4">Analisi dati in corso...</p></TableCell></TableRow>
              ) : reportData.length > 0 ? reportData.map((row) => (
                <TableRow key={row.id} className="h-16 hover:bg-slate-50/50 transition-colors">
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border shadow-sm"><AvatarImage src={row.photoUrl} /><AvatarFallback className="font-bold">{row.name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex flex-col"><span className="font-bold text-slate-900 text-base">{row.name}</span><span className="text-xs text-slate-400 font-bold uppercase tracking-tight">{row.jobTitle}</span></div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center"><span className="text-sm font-bold text-slate-400">{row.expectedHoursFormatted}</span></TableCell>
                  <TableCell className="text-center"><span className="text-sm font-bold text-amber-600">{row.vacationHoursFormatted}</span></TableCell>
                  <TableCell className="text-center"><span className="text-sm font-bold text-rose-600">{row.sickHoursFormatted}</span></TableCell>
                  <TableCell className="text-center"><span className="text-sm font-bold text-cyan-600">{row.permitHoursFormatted}</span></TableCell>
                  <TableCell className="text-center"><span className="text-sm font-black text-emerald-600">{row.overtimeHoursFormatted}</span></TableCell>
                  <TableCell className="text-right pr-8"><span className={cn("text-lg font-black transition-colors", row.isAdded ? "text-emerald-600" : "text-[#227FD8]")}>{row.totalHoursFormatted}</span></TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={7} className="h-40 text-center text-slate-400 italic font-medium">Nessun dato trovato per il periodo selezionato.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
