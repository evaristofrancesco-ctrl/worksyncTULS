
"use client"

import { useState, useMemo } from "react"
import { 
  Calculator, 
  Download, 
  Loader2,
  RefreshCw,
  Send,
  CalendarDays,
  FileSpreadsheet,
  Grid3X3
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
import { collection, collectionGroup, query } from "firebase/firestore"
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO, isValid, isSameDay } from "date-fns"
import { it } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { sendReportEmail } from "@/ai/flows/send-report-flow"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

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

  // Arrotondamento 20m per il calcolo report
  const getRoundedTime = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    const totalM = h * 60 + m;
    const targets = [9 * 60, 13 * 60, 17 * 0, 20 * 60 + 20]; // 09:00, 13:00, 17:00, 20:20
    for (const target of targets) {
      if (Math.abs(totalM - target) <= 20) {
        const rounded = new Date(date);
        rounded.setHours(Math.floor(target / 60), target % 60, 0, 0);
        return rounded;
      }
    }
    return date;
  };

  const formatTime = (decimalHours: number) => {
    if (decimalHours === undefined || decimalHours === null || Math.abs(decimalHours) < 0.01) return "0";
    const totalMinutes = Math.round(decimalHours * 60);
    const absMinutes = Math.abs(totalMinutes);
    const h = Math.floor(absMinutes / 60);
    const m = absMinutes % 60;
    const sign = totalMinutes < 0 ? "-" : "";
    
    // Converte i minuti in formato .X per la visualizzazione richiesta (es. 20m -> .2)
    const displayMinutes = Math.round(m / 6); 
    if (displayMinutes === 0) return `${sign}${h}`;
    return `${sign}${h}.${displayMinutes}`;
  };

  const processedData = useMemo(() => {
    if (!employees || !allEntries || !allRequests || !allShifts) return { summary: [], dailyGrid: [], monthDays: [], totalsByDay: [] };

    const selMonthInt = parseInt(selectedMonth);
    const selYearInt = parseInt(selectedYear);
    const monthStart = startOfMonth(new Date(selYearInt, selMonthInt, 1));
    const monthEnd = endOfMonth(new Date(selYearInt, selMonthInt, 1));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const workingDaysCount = daysInMonth.filter(d => d.getDay() !== 0).length;

    const entriesMap = new Map();
    allEntries.forEach(e => {
      if (!e.checkInTime) return;
      const dateKey = e.checkInTime.split('T')[0];
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
      if (!s.date) return;
      const key = `${s.employeeId}_${s.date}`;
      const list = shiftsMap.get(key) || [];
      list.push(s);
      shiftsMap.set(key, list);
    });

    const dailyGrid: any[] = [];
    const totalsByDay = new Array(daysInMonth.length).fill(0);

    const summary = employees.filter(emp => {
      const isFrancesco = emp.firstName?.toLowerCase() === 'francesco' && emp.lastName?.toLowerCase() === 'evaristo';
      return !isFrancesco;
    }).map(emp => {
      let totalWorkHours = 0;
      let totalDaysCount = 0;
      let vacationHours = 0;
      let sickHours = 0;
      let permitHours = 0;
      
      const STD_DAY_HOURS = 7.3333; // 7h 20m

      const rowDays = daysInMonth.map((day, idx) => {
        const dStr = format(day, 'yyyy-MM-dd');
        let cellValue: string | number = "";
        let cellType: 'work' | 'vacation' | 'sick' | 'permit' | 'rest' | 'none' = 'none';

        // 1. Calcolo ore lavorate effettive (con arrotondamento e gestione sessioni in corso)
        let dayWork = 0;
        const dayEntries = entriesMap.get(`${emp.id}_${dStr}`) || [];
        dayEntries.forEach((e: any) => {
          if (e.checkInTime) {
            const start = getRoundedTime(new Date(e.checkInTime));
            let end;
            if (e.checkOutTime) {
              end = getRoundedTime(new Date(e.checkOutTime));
            } else if (isSameDay(day, new Date())) {
              end = new Date(); // Sessione in corso: usa l'ora attuale per il conteggio real-time
            }
            if (isValid(start) && end && isValid(end)) {
              const diff = (end.getTime() - start.getTime()) / 3600000;
              if (diff > 0) dayWork += diff;
            }
          }
        });

        // 2. Controllo assenze e riposi
        const empRequests = requestsMap.get(emp.id) || [];
        const req = empRequests.find((r: any) => r.startDate <= dStr && (r.endDate || r.startDate) >= dStr);
        const dayShifts = shiftsMap.get(`${emp.id}_${dStr}`) || [];
        const isRestShift = dayShifts.some((s: any) => s.type === 'REST');

        if (req) {
          if (req.type === "VACATION") { cellValue = "F"; cellType = "vacation"; vacationHours += STD_DAY_HOURS; }
          else if (req.type === "SICK") { cellValue = "M"; cellType = "sick"; sickHours += STD_DAY_HOURS; }
          else if (req.type === "PERSONAL") { cellValue = "P"; cellType = "permit"; permitHours += STD_DAY_HOURS; }
          else if (req.type === "REST_SWAP") { cellValue = "R"; cellType = "rest"; }
          else if (req.type === "HOURLY_PERMIT") {
            if (req.startTime && req.endTime) {
              const [h1, m1] = req.startTime.split(':').map(Number);
              const [h2, m2] = req.endTime.split(':').map(Number);
              const diff = (h2 + m2/60) - (h1 + m1/60);
              if (diff > 0) { 
                // Se c'è lavoro, mostreremo il totale (lavoro + permesso orario)
                dayWork += diff;
                permitHours += diff;
              }
            }
          }
        } else if (isRestShift && dayWork === 0) {
          cellValue = "R";
          cellType = "rest";
        }

        // Priorità visualizzazione: se c'è lavoro, mostra le ore. Altrimenti mostra il codice assenza/riposo.
        if (dayWork > 0) {
          cellValue = formatTime(dayWork);
          cellType = 'work';
          totalWorkHours += dayWork;
          totalDaysCount++;
          totalsByDay[idx]++;
        } else if (cellValue) {
          totalDaysCount++;
          totalsByDay[idx]++;
        }

        return { day, value: cellValue, type: cellType };
      });

      dailyGrid.push({ emp, rowDays, totalDaysCount, totalWorkHours });

      const weeklyHours = emp.weeklyHours || 40;
      const expectedHours = (weeklyHours / 6) * workingDaysCount;
      const totalAbsences = vacationHours + sickHours + permitHours;

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        photoUrl: emp.photoUrl,
        jobTitle: emp.jobTitle,
        workedHours: totalWorkHours,
        vacationHours,
        sickHours,
        permitHours,
        expectedHours,
        hasAbsences: totalAbsences > 0,
        totalNet: totalWorkHours - totalAbsences
      };
    });

    return { summary, dailyGrid, monthDays: daysInMonth, totalsByDay };
  }, [employees, allEntries, allRequests, allShifts, selectedMonth, selectedYear]);

  const generateStyledExcelHTML = () => {
    const { dailyGrid, monthDays, totalsByDay, summary } = processedData;
    if (!dailyGrid.length) return "";
    const selMonthLabel = MONTHS[parseInt(selectedMonth)].label;
    const title = `REPORT PRESENZE - ${selMonthLabel} ${selectedYear}`;

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; }
          td, th { border: 1px solid #cccccc; padding: 8px; text-align: center; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; }
          .header { background-color: #f1f5f9; font-weight: bold; }
          .sunday { background-color: #ef4444; color: #ffffff; font-weight: bold; }
          .employee-name { text-align: left; font-weight: bold; background-color: #ffffff; }
          .total-col { background-color: #e2e8f0; font-weight: bold; }
          .sum-hours { color: #ef4444; font-weight: bold; background-color: #e2e8f0; }
          .vacation { background-color: #10b981; color: #ffffff; font-weight: bold; }
          .sick { background-color: #2563eb; color: #ffffff; font-weight: bold; }
          .permit { background-color: #94a3b8; color: #ffffff; font-weight: bold; }
          .rest { background-color: #475569; color: #ffffff; font-weight: bold; }
          .total-net-red { color: #ef4444; font-weight: bold; }
          .title-row { font-size: 16pt; font-weight: bold; height: 40px; text-align: left; border: none; color: #1e293b; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="${monthDays.length + 3}" class="title-row">${title}</td></tr>
          <tr><td></td></tr>
          <tr class="header">
            <td style="text-align: left;">Nome dipendente</td>
            ${monthDays.map(day => `<td>${format(day, 'd')}</td>`).join('')}
            <td>Totale giorni</td>
            <td>SOMMA ORE</td>
          </tr>
          <tr class="header">
            <td></td>
            ${monthDays.map(day => {
              const isSun = day.getDay() === 0;
              return `<td class="${isSun ? 'sunday' : ''}">${format(day, 'eee', { locale: it }).toUpperCase()}</td>`;
            }).join('')}
            <td></td>
            <td></td>
          </tr>
    `;

    dailyGrid.forEach(row => {
      html += `
        <tr>
          <td class="employee-name">${row.emp.firstName} ${row.emp.lastName}</td>
          ${row.rowDays.map((d: any) => {
            const isSun = d.day.getDay() === 0;
            let cssClass = isSun ? 'sunday' : '';
            if (d.type === 'vacation') cssClass = 'vacation';
            else if (d.type === 'sick') cssClass = 'sick';
            else if (d.type === 'rest') cssClass = 'rest';
            else if (d.type === 'permit') cssClass = 'permit';
            return `<td class="${cssClass}">${d.value || ""}</td>`;
          }).join('')}
          <td class="total-col">${row.totalDaysCount}</td>
          <td class="sum-hours">${formatTime(row.totalWorkHours)}</td>
        </tr>
      `;
    });

    html += `
          <tr class="total-col">
            <td style="text-align: left;">TOTALE GIORNALIERO</td>
            ${totalsByDay.map((val, idx) => {
              const isSun = monthDays[idx].getDay() === 0;
              return `<td class="${isSun ? 'sunday' : ''}">${val > 0 ? val : ""}</td>`;
            }).join('')}
            <td></td>
            <td>${totalsByDay.reduce((a, b) => a + b, 0)}</td>
          </tr>
        </table>
        <br><br>
        <table>
          <tr class="header">
            <td style="text-align: left;">Riepilogo Totale</td>
            <td>Ore Previste</td>
            <td>Ore Lavorate</td>
            <td>Ferie (h)</td>
            <td>Malattia (h)</td>
            <td>Permessi (h)</td>
            <td>Ore Totali (Netto)</td>
          </tr>
          ${summary.map(s => `
            <tr>
              <td style="text-align: left;">${s.name}</td>
              <td>${formatTime(s.expectedHours)}</td>
              <td>${formatTime(s.workedHours)}</td>
              <td>${formatTime(s.vacationHours)}</td>
              <td>${formatTime(s.sickHours)}</td>
              <td>${formatTime(s.permitHours)}</td>
              <td class="${s.hasAbsences ? 'total-net-red' : ''}">${formatTime(s.totalNet)}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;
    return html;
  }

  const handleExportStyledExcel = () => {
    const content = generateStyledExcelHTML();
    if (!content) return;
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Report_TU.L.S._${MONTHS[parseInt(selectedMonth)].label}_${selectedYear}.xls`);
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
        fileContent: generateStyledExcelHTML(),
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
          <p className="text-slate-500 font-medium">Analisi presenze e assenze in formato tabellare.</p>
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
          <Button variant="outline" size="sm" className="h-10 gap-2 font-bold border-[#227FD8] text-[#227FD8]" onClick={handleExportStyledExcel} disabled={isLoading}>
            <Download className="h-4 w-4" /> Esporta Excel
          </Button>
          <Button variant="default" size="sm" className="h-10 gap-2 font-black bg-[#227FD8] shadow-md" onClick={() => setIsEmailOpen(true)} disabled={isLoading}>
            <Send className="h-4 w-4" /> Invia Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl h-12 mb-6">
          <TabsTrigger value="grid" className="px-8 font-black uppercase text-xs gap-2 data-[state=active]:bg-white">
            <Grid3X3 className="h-4 w-4" /> Griglia Presenze
          </TabsTrigger>
          <TabsTrigger value="summary" className="px-8 font-black uppercase text-xs gap-2 data-[state=active]:bg-white">
            <FileSpreadsheet className="h-4 w-4" /> Riepilogo Mensile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          <Card className="border-none shadow-sm overflow-hidden bg-[#F4F8FA]">
            <CardHeader className="p-6 pb-2">
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-6">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Chiave tipo di assenza</span>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-emerald-500 text-white flex items-center justify-center rounded text-[10px] font-black">F</div> <span className="text-[10px] font-bold text-slate-600">Ferie</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-slate-400 text-white flex items-center justify-center rounded text-[10px] font-black">P</div> <span className="text-[10px] font-bold text-slate-600">Permesso</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-blue-600 text-white flex items-center justify-center rounded text-[10px] font-black">M</div> <span className="text-[10px] font-bold text-slate-600">Malattia</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-slate-600 text-white flex items-center justify-center rounded text-[10px] font-black">R</div> <span className="text-[10px] font-bold text-slate-600">Riposo</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-amber-200 border border-amber-300 rounded"></div> <span className="text-[10px] font-bold text-slate-600">Permesso orario</span></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">Date Presenze e assenze</h2>
                  <span className="text-2xl font-black text-slate-400">{selectedYear}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <div className="min-w-[1200px]">
                  <Table className="border-collapse">
                    <TableHeader>
                      <TableRow className="h-10 hover:bg-transparent border-none">
                        <TableHead className="w-[200px] border-r"></TableHead>
                        {processedData.monthDays.map((day, idx) => (
                          <TableHead key={idx} className={cn(
                            "w-10 text-center p-0 text-[10px] font-black uppercase border-r",
                            day.getDay() === 0 ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-500"
                          )}>
                            {format(day, 'eee', { locale: it })}
                          </TableHead>
                        ))}
                        <TableHead className="w-24 text-center text-[10px] font-black uppercase border-l bg-slate-100">Totale giorni</TableHead>
                        <TableHead className="w-24 text-center text-[10px] font-black uppercase bg-slate-100">SOMMA ORE</TableHead>
                      </TableRow>
                      <TableRow className="h-10 hover:bg-transparent">
                        <TableHead className="w-[200px] border-r font-black text-[11px] uppercase bg-slate-50">Nome dipendente</TableHead>
                        {processedData.monthDays.map((day, idx) => (
                          <TableHead key={idx} className={cn(
                            "w-10 text-center p-0 text-xs font-black border-r",
                            day.getDay() === 0 ? "bg-rose-600 text-white" : "bg-slate-300 text-slate-700"
                          )}>
                            {format(day, 'd')}
                          </TableHead>
                        ))}
                        <TableHead className="w-24 border-l bg-slate-200"></TableHead>
                        <TableHead className="w-24 bg-slate-200"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.dailyGrid.map((row, rIdx) => (
                        <TableRow key={rIdx} className="h-12 hover:bg-slate-100 group border-b border-slate-200">
                          <TableCell className="w-[200px] border-r font-bold text-xs text-slate-700 bg-white">
                            {row.emp.firstName} {row.emp.lastName}
                          </TableCell>
                          {row.rowDays.map((d: any, dIdx: number) => {
                            const isSunday = d.day.getDay() === 0;
                            return (
                              <TableCell key={dIdx} className={cn(
                                "w-10 p-0 text-center border-r transition-colors",
                                isSunday ? "bg-rose-600/90 text-white" : "bg-white group-hover:bg-slate-50"
                              )}>
                                {d.value && (
                                  <div className={cn(
                                    "w-full h-full flex items-center justify-center font-black text-[10px]",
                                    d.type === 'vacation' && "bg-emerald-500 text-white",
                                    d.type === 'sick' && "bg-blue-600 text-white",
                                    d.type === 'rest' && "bg-slate-600 text-white",
                                    d.type === 'permit' && d.value === 'P' && "bg-slate-400 text-white",
                                    d.type === 'permit' && d.value !== 'P' && "bg-amber-100 text-amber-900 border border-amber-200",
                                    d.type === 'work' && (isSunday ? "text-white" : "text-slate-700")
                                  )}>
                                    {d.value}
                                  </div>
                                )}
                              </TableCell>
                            )
                          })}
                          <TableCell className="w-24 text-center border-l bg-slate-300/50 font-black text-xs text-slate-700">
                            {row.totalDaysCount}
                          </TableCell>
                          <TableCell className="w-24 text-center bg-slate-300/50 font-black text-xs text-rose-600">
                            {formatTime(row.totalWorkHours)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card className="border-none shadow-sm overflow-hidden bg-white">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="h-12">
                    <TableHead className="text-sm font-bold uppercase text-slate-500 pl-8">Collaboratore</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Ore Previste</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Ferie (h)</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Malattia (h)</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Permessi (h)</TableHead>
                    <TableHead className="text-right text-sm font-bold uppercase pr-8 text-slate-500">Ore Totali</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-64 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#227FD8]" /></TableCell></TableRow>
                  ) : processedData.summary.length > 0 ? processedData.summary.map((row) => (
                    <TableRow key={row.id} className="h-16 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border shadow-sm"><AvatarImage src={row.photoUrl} /><AvatarFallback className="font-bold">{row.name.charAt(0)}</AvatarFallback></Avatar>
                          <div className="flex flex-col"><span className="font-bold text-slate-900">{row.name}</span><span className="text-[10px] text-slate-400 font-bold uppercase">{row.jobTitle}</span></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-400">{formatTime(row.expectedHours)}</TableCell>
                      <TableCell className="text-center font-bold text-emerald-600">{formatTime(row.vacationHours)}</TableCell>
                      <TableCell className="text-center font-bold text-blue-600">{formatTime(row.sickHours)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-500">{formatTime(row.permitHours)}</TableCell>
                      <TableCell className="text-right pr-8">
                        <span className={cn("text-lg font-black", row.hasAbsences ? "text-rose-600" : "text-slate-900")}>
                          {formatTime(row.totalNet)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={6} className="h-40 text-center italic">Nessun dato trovato.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
            <Button onClick={handleSendEmail} disabled={isSending || !destEmail} className="bg-[#227FD8] font-black h-12 px-8">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />} SPEDISCI REPORT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
