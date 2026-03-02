
"use client"

import { useState, useMemo } from "react"
import { 
  Calculator, 
  Download, 
  Users, 
  Loader2,
  RefreshCw,
  Send,
  Mail,
  CheckCircle2,
  CalendarDays,
  FileSpreadsheet
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, collectionGroup, query, where } from "firebase/firestore"
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO, isValid, isSameDay } from "date-fns"
import { it } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { sendReportEmail } from "@/ai/flows/send-report-flow"

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
  const { toast } = useToast()
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const [isEmailOpen, setIsEmailOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [destEmail, setDestEmail] = useState("")

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

  const processedData = useMemo(() => {
    if (!employees || !allEntries || !allRequests || !allShifts) return { summary: [], daily: {} };

    const selMonthInt = parseInt(selectedMonth);
    const selYearInt = parseInt(selectedYear);
    const monthStart = startOfMonth(new Date(selYearInt, selMonthInt, 1));
    const monthEnd = endOfMonth(new Date(selYearInt, selMonthInt, 1));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Ottimizzazione: Raggruppamento dati per accesso rapido O(1) invece di O(N) find
    const entriesMap = new Map();
    allEntries.forEach(e => {
      const dateKey = e.checkInTime ? e.checkInTime.split('T')[0] : null;
      if (!dateKey) return;
      const key = `${e.employeeId}_${dateKey}`;
      const list = entriesMap.get(key) || [];
      list.push(e);
      entriesMap.set(key, list);
    });

    const requestsMap = new Map();
    allRequests.forEach(r => {
      const status = (r.status || "").toUpperCase();
      if (!(status === "APPROVATO" || status === "APPROVED" || status === "Approvato")) return;
      const key = r.employeeId;
      const list = requestsMap.get(key) || [];
      list.push(r);
      requestsMap.set(key, list);
    });

    const shiftsMap = new Map();
    allShifts.forEach(s => {
      const key = `${s.employeeId}_${s.date}`;
      const list = shiftsMap.get(key) || [];
      list.push(s);
      shiftsMap.set(key, list);
    });

    const dailyMap: Record<string, any> = {};

    const summary = employees.filter(emp => {
      const isFrancesco = emp.firstName?.toLowerCase() === 'francesco' && emp.lastName?.toLowerCase() === 'evaristo';
      return !isFrancesco;
    }).map(emp => {
      let monthlyExpectedHours = 0;
      let actualWorkHours = 0;
      let vacationHours = 0;
      let sickHours = 0;
      let permitHours = 0;
      let overtimeHours = 0;
      let detailEntries: string[] = [];
      
      const empDaily: Array<{ 
        date: Date, 
        work: number, 
        overtime: number, 
        absence: number, 
        absenceType: string 
      }> = [];

      daysInMonth.forEach(day => {
        const dStr = format(day, 'yyyy-MM-dd');
        const dayOfWeekStr = day.getDay().toString();
        
        // Calcolo ore previste
        if (dayOfWeekStr !== "0") {
          const isRestDay = dayOfWeekStr === emp.restDay;
          const rStart = emp.restStartTime || "00:00";
          const rEnd = emp.restEndTime || "00:00";
          const isSavino = emp.firstName?.toLowerCase().includes('savino') || emp.lastName?.toLowerCase().includes('savino');

          if (isSavino) {
            const dayIdx = day.getDay();
            let amH = 1; if (dayIdx === 4) amH = 4; else if (dayIdx === 6) amH = 2;
            monthlyExpectedHours += (amH + 3.333333);
          } else {
            if (emp.contractType === 'full-time') {
              if (!(isRestDay && ("09:00" < rEnd && "13:00" > rStart))) monthlyExpectedHours += 4;
              if (!(isRestDay && ("17:00" < rEnd && "20:20" > rStart))) monthlyExpectedHours += 3.333333;
            } else {
              if (!(isRestDay && ("17:00" < rEnd && "20:20" > rStart))) monthlyExpectedHours += 3.333333;
            }
          }
        }

        // Ore effettive del giorno (da Mappa)
        let dayWork = 0;
        const dayEntries = entriesMap.get(`${emp.id}_${dStr}`) || [];
        dayEntries.forEach((e: any) => {
          if (e.checkInTime && e.checkOutTime) {
            const diff = (new Date(e.checkOutTime).getTime() - new Date(e.checkInTime).getTime()) / 3600000;
            if (diff > 0) dayWork += diff;
          }
        });
        actualWorkHours += dayWork;

        // Straordinari del giorno (da Mappa)
        let dayOvertime = 0;
        const dayShifts = shiftsMap.get(`${emp.id}_${dStr}`) || [];
        dayShifts.filter((s: any) => s.type === 'OVERTIME').forEach((s: any) => {
          const diff = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000;
          if (diff > 0) dayOvertime += diff;
        });
        overtimeHours += dayOvertime;

        // Assenze del giorno
        let dayAbsence = 0;
        let dayAbsenceType = "";

        // 1. Da richieste approvate (da Mappa)
        const empRequests = requestsMap.get(emp.id) || [];
        const req = empRequests.find((r: any) => r.startDate <= dStr && (r.endDate || r.startDate) >= dStr);

        if (req) {
          if (req.type === "VACATION") { dayAbsence = 8; dayAbsenceType = "Ferie"; vacationHours += 8; }
          else if (req.type === "SICK") { dayAbsence = 8; dayAbsenceType = "Malattia"; sickHours += 8; }
          else if (req.type === "PERSONAL") { dayAbsence = 8; dayAbsenceType = "Permesso"; permitHours += 8; }
          else if (req.type === "HOURLY_PERMIT") {
            if (req.startTime && req.endTime) {
              const [h1, m1] = req.startTime.split(':').map(Number);
              const [h2, m2] = req.endTime.split(':').map(Number);
              const diff = (h2 + m2/60) - (h1 + m1/60);
              if (diff > 0) { dayAbsence = diff; dayAbsenceType = "Permesso Orario"; permitHours += diff; }
            }
          }
        } else {
          // 2. Da badge manuali nel calendario
          const shiftAbs = dayShifts.find((s: any) => (s.type === 'ABSENCE' || s.type === 'SICK'));
          if (shiftAbs) {
            dayAbsence = 8;
            dayAbsenceType = shiftAbs.type === 'SICK' ? "Malattia" : "Assenza/Ferie";
            if (shiftAbs.type === 'SICK') sickHours += 8; else vacationHours += 8;
          }
        }

        if (dayWork > 0 || dayOvertime > 0 || dayAbsence > 0) {
          empDaily.push({ date: day, work: dayWork, overtime: dayOvertime, absence: dayAbsence, absenceType: dayAbsenceType });
          if (dayAbsence > 0) {
            detailEntries.push(`${format(day, 'dd/MM')} ${dayAbsenceType} [${formatTime(dayAbsence)}]`);
          }
          if (dayOvertime > 0) {
            detailEntries.push(`${format(day, 'dd/MM')} Straord. [${formatTime(dayOvertime)}]`);
          }
        }
      });

      dailyMap[emp.id] = empDaily;

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
        totalHoursFormatted: formatTime(actualWorkHours + overtimeHours),
        isAdded: overtimeHours > 0,
        absenceDetailStr: detailEntries.join(" | ")
      }
    });

    return { summary, daily: dailyMap };
  }, [employees, allEntries, allRequests, allShifts, selectedMonth, selectedYear]);

  const generateCSVContent = () => {
    const { summary, daily } = processedData;
    if (!summary.length) return "";
    
    let csv = "REPORT RIEPILOGO MENSILE\n";
    csv += "Collaboratore;Ruolo;Ore Previste;Ore Lavorate;Ferie;Malattia;Permessi;Straordinari;Ore Nette;Dettaglio\n";
    summary.forEach(r => {
      csv += `${r.name};${r.jobTitle};${r.expectedHoursFormatted};${r.workedHoursFormatted};${r.vacationHoursFormatted};${r.sickHoursFormatted};${r.permitHoursFormatted};${r.overtimeHoursFormatted};${r.totalHoursFormatted};"${r.absenceDetailStr}"\n`;
    });

    csv += "\n\nDETTAGLIO ANALITICO GIORNALIERO\n";
    csv += "Data;Collaboratore;Lavoro;Straordinario;Assenza;Tipo Assenza\n";
    Object.entries(daily).forEach(([empId, days]: [string, any]) => {
      const emp = summary.find(s => s.id === empId);
      days.forEach((d: any) => {
        csv += `${format(d.date, 'dd/MM/yyyy')};${emp?.name};${formatTime(d.work)};${formatTime(d.overtime)};${formatTime(d.absence)};${d.absenceType}\n`;
      });
    });

    return csv;
  }

  const handleExportCSV = () => {
    const csvContent = generateCSVContent();
    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Report_TU.L.S._${MONTHS[parseInt(selectedMonth)].label}_${selectedYear}.csv`);
    link.click();
  };

  const handleSendEmail = async () => {
    if (!destEmail) return;
    setIsSending(true);
    try {
      const result = await sendReportEmail({
        recipientEmail: destEmail,
        monthLabel: MONTHS[parseInt(selectedMonth)].label,
        year: selectedYear,
        csvContent: generateCSVContent(),
        adminName: user?.displayName || "Amministrazione TU.L.S."
      });
      if (result.success) {
        toast({ title: "Email Inviata" });
        setIsEmailOpen(false);
      } else {
        toast({ variant: "destructive", title: "Errore Invio", description: result.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore", description: e.message });
    } finally {
      setIsSending(false);
    }
  }

  const isLoading = employeesLoading || entriesLoading || requestsLoading || shiftsLoading || isRefreshing;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] flex items-center gap-3">
            <Calculator className="h-8 w-8 text-[#227FD8]" /> Conteggio Mensile
          </h1>
          <p className="text-slate-500 font-medium">Riepilogo ore contrattuali, straordinari e dettaglio giornaliero.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[150px] border-none font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] border-none font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>{yearsOptions.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
          </Select>
          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />
          <Button variant="ghost" size="sm" className="h-10 gap-2 font-bold text-[#227FD8] hover:bg-blue-50" onClick={() => setIsRefreshing(true) || setTimeout(() => setIsRefreshing(false), 800)} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" className="h-10 gap-2 font-bold border-[#227FD8] text-[#227FD8]" onClick={handleExportCSV} disabled={isLoading}>
            <Download className="h-4 w-4" /> Esporta
          </Button>
          <Button variant="default" size="sm" className="h-10 gap-2 font-black bg-[#227FD8] shadow-md" onClick={() => setIsEmailOpen(true)} disabled={isLoading}>
            <Send className="h-4 w-4" /> Invia Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl h-12 mb-6">
          <TabsTrigger value="summary" className="px-8 font-black uppercase text-xs gap-2 data-[state=active]:bg-white">
            <FileSpreadsheet className="h-4 w-4" /> Riepilogo Mensile
          </TabsTrigger>
          <TabsTrigger value="daily" className="px-8 font-black uppercase text-xs gap-2 data-[state=active]:bg-white">
            <CalendarDays className="h-4 w-4" /> Dettaglio Giornaliero
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card className="border-none shadow-sm overflow-hidden bg-white">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="h-12">
                    <TableHead className="text-sm font-bold uppercase text-slate-500 pl-8">Collaboratore</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Previste (h)</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Ferie (h)</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Malattia (h)</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Permessi (h)</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center text-emerald-600">Extra (h)</TableHead>
                    <TableHead className="text-right text-sm font-bold uppercase pr-8 text-slate-500">Ore Nette</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="h-64 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#227FD8]" /></TableCell></TableRow>
                  ) : processedData.summary.length > 0 ? processedData.summary.map((row) => (
                    <TableRow key={row.id} className="h-16 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border shadow-sm"><AvatarImage src={row.photoUrl} /><AvatarFallback className="font-bold">{row.name.charAt(0)}</AvatarFallback></Avatar>
                          <div className="flex flex-col"><span className="font-bold text-slate-900">{row.name}</span><span className="text-[10px] text-slate-400 font-bold uppercase">{row.jobTitle}</span></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-400">{row.expectedHoursFormatted}</TableCell>
                      <TableCell className="text-center font-bold text-amber-600">{row.vacationHoursFormatted}</TableCell>
                      <TableCell className="text-center font-bold text-rose-600">{row.sickHoursFormatted}</TableCell>
                      <TableCell className="text-center font-bold text-cyan-600">{row.permitHoursFormatted}</TableCell>
                      <TableCell className="text-center font-black text-emerald-600">{row.overtimeHoursFormatted}</TableCell>
                      <TableCell className="text-right pr-8"><span className={cn("text-lg font-black", row.isAdded ? "text-emerald-600" : "text-[#227FD8]")}>{row.totalHoursFormatted}</span></TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={7} className="h-40 text-center italic">Nessun dato trovato.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="space-y-8">
          {isLoading ? (
            <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-[#227FD8]" /></div>
          ) : Object.entries(processedData.daily).map(([empId, days]: [string, any]) => {
            const emp = processedData.summary.find(s => s.id === empId);
            return (
              <Card key={empId} className="border-none shadow-sm overflow-hidden bg-white ring-1 ring-slate-200">
                <CardHeader className="bg-slate-50 border-b p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarImage src={emp?.photoUrl} /><AvatarFallback>{emp?.name.charAt(0)}</AvatarFallback></Avatar>
                    <CardTitle className="text-base font-black uppercase text-[#1e293b]">{emp?.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/20">
                        <TableHead className="w-[150px] font-bold text-[10px] uppercase pl-6">Data</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-center">Ore Lavoro</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-center">Straordinario</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-center">Assenza / Permesso</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase pr-6 text-right">Dettaglio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {days.map((d: any, idx: number) => (
                        <TableRow key={idx} className="h-12 hover:bg-slate-50/30">
                          <TableCell className="pl-6 font-bold text-slate-600">{format(d.date, 'EEEE d MMM', { locale: it })}</TableCell>
                          <TableCell className="text-center font-bold text-[#227FD8]">{d.work > 0 ? formatTime(d.work) : "---"}</TableCell>
                          <TableCell className="text-center font-bold text-emerald-600">{d.overtime > 0 ? formatTime(d.overtime) : "---"}</TableCell>
                          <TableCell className="text-center font-bold text-rose-500">{d.absence > 0 ? formatTime(d.absence) : "---"}</TableCell>
                          <TableCell className="pr-6 text-right font-black text-[9px] uppercase text-slate-400">{d.absenceType || (d.work > 0 ? "Lavoro Regolare" : "")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black">Invia Report Mensile</DialogTitle><DialogDescription>Spedisci il report completo a un indirizzo email.</DialogDescription></DialogHeader>
          <div className="py-6 space-y-4">
            <Label className="font-bold text-xs uppercase text-slate-500">Email Destinatario</Label>
            <Input type="email" placeholder="es. consulente@tuls.it" className="h-12" value={destEmail} onChange={(e) => setDestEmail(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEmailOpen(false)} className="font-bold">Annulla</Button>
            <Button onClick={handleSendEmail} disabled={isSending || !destEmail} className="bg-[#227FD8] font-black px-8">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />} SPEDISCI REPORT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
